"""Assessment Blocks displays problems of the library. The editor selects the library. The learners view problems of
   the selected library.The problems are visible in the assessment Player, one problem at  a time with progress bar on
   the  top.
"""

import pkg_resources
import logging
import datetime
from datetime import datetime as dt
import pytz
from pytz import timezone
from copy import copy
from django.utils import translation
from xblock.core import XBlock
from xblock.fields import Scope, Integer,String,List,Boolean,Float
from xblock.fragment import Fragment
from xblockutils.publish_event import PublishEventMixin
from opaque_keys.edx.locator import LibraryLocator
from xmodule.x_module import STUDENT_VIEW ,XModule
from xmodule.capa_module import  CapaModule
from six import text_type
from xblockutils.resources import ResourceLoader
from django.contrib.auth.models import User
from instructor.services import InstructorService
from random import shuffle
from xmodule.modulestore.django import modulestore
from xmodule.library_tools import  LibraryToolsService
from xmodule.modulestore.exceptions import ItemNotFoundError
from xblock.completable import XBlockCompletionMode as CompletionMode
import completion
from completion.models import BlockCompletion
import re
import access_course
from access_course.utils import  send_course_progress,send_training_progress
from django.db import transaction
import json
from django.conf import settings
from opaque_keys.edx.keys import CourseKey, UsageKey
from student.models import CourseEnrollment
from courseware.models import StudentModule
from access_course.models import userdetails
from .reports import prepare_report
 
LOG = logging.getLogger(__name__)
RESOURCE_LOADER = ResourceLoader(__name__)
_ = lambda text: text

ASSESSMENT_TEMPLATE = "/static/html/assessmentxblock.html"
ASSESSMENT_EDIT_TEMPLATE = "/static/html/assessmentxblock_edit.html"
#DEFAULT_COMPLETION_TRACKING_START = datetime.datetime(2018, 1, 24, tzinfo=UTC)
DEFAULT_DATE_TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
DEFAULT_TIME_ZONE = 'UTC'

@XBlock.needs("i18n")  # pylint: disable=too-many-ancestors
@XBlock.wants('library_tools')
@XBlock.wants('studio_user_permissions')
@XBlock.wants('user')
@XBlock.wants('library_content_module')
@XBlock.wants('library_root_xblock')

class AssesmentXBlock(XBlock,PublishEventMixin):
    """
    The editor selects the library. The learners view problems of the  selected library.The problems are visible in the
    Assessment Player.
    """

    UNIT_TYPE = {
        "KNOWLEDGE_ACQ": "knowledge_acquisition",
        "TRAINING": "training",
        "DEEP_LEARNING": "deep_learning",
        "ECG_COMPETITION": "ecg_competition",
        "CME_TEST": "cme_test"
    }

    complete = Float(
        help=_("Indicates whether a learner has completed the problem at least once"),
        scope=Scope.user_state,
        #default=0.0,
        enforce_type=True,
    )


    display_name = String(
        display_name=_("Display Name"),
        help=_("This name appears in the horizontal navigation at the top of the page."),
        scope=Scope.settings,
        default="Assessment Block"
    )

    source_library_id = String(
        display_name=_("Library"),
        help=_("Select the library from which you want to fetch problems."),
        scope=Scope.settings,
        #default="library-v1:test+test",
        values_provider=lambda instance: instance.source_library_values(),
    )

    source_library_version = String(
        # This is a hidden field that stores the version of source_library when we last pulled content from it
        display_name=_("Library Version"),
        scope=Scope.settings,
    )

    problems = List(
        display_name=_("Problem"),
        help=_("Change  the order of all problem which you want to fetch problems."),
        scope=Scope.settings,
    )

    display_feedback = Integer(
        display_name=_("Display Feedback"),
        help=_("Determines if the feedback is displayed in the end of the assessment"),
        default="1",
        values=[
            {"display_name": _("Yes"), "value": 1},
            {"display_name": _("No"), "value": 0}
        ],
        scope=Scope.settings,
    )
    '''completion_mode = String(
        display_name=_("Completion Mode"),
        help="The completion mode to be used in Completion API",
        default= CompletionMode.COMPLETABLE,
        scope = Scope.settings

    )'''
    
    definitively_repeat = Integer(
        display_name=_("Definitely Repeat (<)"),
        help=_(
            'Enter the percentage(0-100) of correct problems below which the status will be "definitely repeat" for each student.'),
        default=40,
        scope=Scope.settings,
    )

    continue_with_next = Integer(
        display_name=_("Continue with Next (>=)"),
        help=_(
            'Enter the percentage(0-100) of correct problems after which the status will be "continue to next" for each student.'),
        default=70,
        scope=Scope.settings,
    )

    module_link = String (display_name=_("Module Link"),
        help=_("The short cut for the learner to go if he wants to repeat the module."),
        default="",
        scope=Scope.settings,
    )

    done = Boolean(
        help=_("Indicates whether a learner has completed the problems at least once"),
        scope=Scope.user_state,
        default=False,
        enforce_type=True,
    )

    def_repeat_msg = String (display_name=_("Definitely Repeat Message"),
        help=_("This message will be displayed when user score is less than Definitely Repeat."),
        default="Definitely Repeat",
        scope=Scope.settings,
    )
    can_repeat_msg = String (display_name=_("Can Repeat Message"),
        help=_("This message will be displayed when user score is between Definitely Repeat and Continue with next."),
        default="Can Repeat",
        scope=Scope.settings,
    )
    next_unit_msg = String (display_name=_("Continue with Next Unit Message"),
        help=_("This message will be displayed when user score is greater than Continue with next unit."),
        default="Continue with next Unit",
        scope=Scope.settings,
    )

    # Hariom - ET254_ECG_COMPETITION
    timer = Integer(
        display_name=_("Timer (in minutes)"),
        help=_(
            'Enter the timer in minutes upto which the problems will be accessible to learner'),
        default=1,
        scope=Scope.settings,
    )

    reset_delay = Integer(
        display_name=_("Re-Attempt Delay (in hours)"),
        help=_(
            'Enter the Re-Attempt Time Delay in hours (Whole numbers Fractions not allowed.). 0 means no delay in reattempt.'),
        default=24,
        scope=Scope.settings,
    )
    feedback_header_msg = String (display_name=_("Feedback Header Message"),
        help=_("This message will be displayed as Header on Feedback slide when user completes ECG Competition."),
        default="Feedback Header Message",
        scope=Scope.settings,
    )
    feedback_text_msg = String (display_name=_("Feedback Text Message"),
        help=_("This message will be displayed on Feedback slide when user completes ECG Competition."),
        default="Thank you for your participation, we will notify you about the results.",
        scope=Scope.settings,
    )
    timeout_feedback_text_msg = String (display_name=_("Timeout Feedback Text Message"),
        help=_("This message will be displayed on Feedback slide when user fails to complete ECG Competition within set timer and time's up."),
        default="Time is up.\nThank you for your participation, we will notify you about the results.",
        scope=Scope.settings,
    )
    start_time = String (display_name=_("Start Time"),
        help=_("This field shows the timestamp at which learner started ECG Competition."),
        default='',
        scope=Scope.user_state,
    )
    end_time = String (display_name=_("End Time"),
        help=_("This field shows the timestamp at which learner ECG Competition will end."),
        default='',
        scope=Scope.user_state,
    )
    feedback_message = ''

    assessment_type = String(
        display_name = _("Type of Unit"),
        help = _("Select the type of assessment block training type"),
        values = [
            {"display_name": _("Knowledge Acquisition"), "value": UNIT_TYPE["KNOWLEDGE_ACQ"]},
            {"display_name": _("Training"), "value": UNIT_TYPE["TRAINING"]},
            {"display_name": _("Deep Learning"), "value": UNIT_TYPE["DEEP_LEARNING"]},
            {"display_name": _("ECG Competition"), "value": UNIT_TYPE["ECG_COMPETITION"]},
            {"display_name": _("CME Test"), "value": UNIT_TYPE["CME_TEST"]}
        ],
        scope=Scope.settings,
    )

    has_children = True
    show_in_read_only_mode = True
    count = Integer(
        default=0, scope=Scope.user_state,
        help="A simple counter, to show something happening",
    )

    first_attempt = Integer(
        default = 1,
        scope =Scope.user_state
    )

    order_list = List(
        default=[],
        scope = Scope.user_state
    )
    current_problem =Integer(
        default=0,
        scope = Scope.user_state
    )
    current_attempt_score=List(
        default=[],
        scope=Scope.user_state
    )

    attempt_score_history=List(
        default=[],
        scope=Scope.user_state
    )
    score_report = List(
        default = [],
        scope = Scope.user_state
    )
    attempt_no = Integer(
        default = 1,
        scope =Scope.user_state
    )

    def library_list(self,lib_tools,user_perms):
        """
        Return a list of possible values for self.source_library_id
        """
        all_libraries = [
            (key, name) for key, name in lib_tools.list_available_libraries()
            if user_perms.can_read(key) or self.source_library_id == unicode(key)
        ]
        all_libraries.sort(key=lambda entry: entry[1])  # Sort by name
        if self.source_library_id and self.source_library_key not in [entry[0] for entry in all_libraries]:
            all_libraries.append((self.source_library_id, _(u"Invalid Library")))
        all_libraries = [(u"", _("No Library Selected"))] + all_libraries
        values = [{"display_name": name, "value": unicode(key)} for key, name in all_libraries]
        return values

    @XBlock.json_handler
    def source_library_values(self, data, suffix=""):
        """
        Return a list of possible values for self.source_library_id
        """
        lib_tools = self.runtime.service(self, 'library_tools')
        user_perms = self.runtime.service(self, 'studio_user_permissions')
        return library_list(lib_tools,user_perms)

    def problem_list(self,library,lib_tools,store):

        prblm_list = []
         
        if library:
            lib=self._get_library(library,store)
            source_blocks ={}
            if lib:
                
                for child in lib.children:
                    childitem = store.get_item(child)

                    source_blocks[child.block_id] =  str(childitem.display_name.encode('utf-8'))
                    
            all_problems = source_blocks
            if self.problems:
                for problem in self.problems:
                    if all_problems.has_key(problem):
                        prblm_list.append({"value":problem,"display_name":all_problems[problem] ,"ordered":1})
                    else:
                        None

            added_problems=set(all_problems.keys()) - set(self.problems)
            for problem in added_problems:
                prblm_list.append({"value": problem, "display_name": all_problems[problem] ,"ordered":0})

        return prblm_list


    def librarydetail(self,library_key,problem_list,user_id,store):
        source_blocks = []
        dest_block =self
        if library_key:
            library=self._get_library(library_key,store)
            if library:
                for problem_id in problem_list :
                    for child in library.children:
                         if child.block_id == problem_id:
                             source_blocks.append(child)
                             break
                version = None
                with store.bulk_operations(dest_block.location.course_key):
                    self.source_library_version = unicode(library.location.library_key.version_guid)
                    store.update_item(dest_block, user_id)
                    head_validation = not version
                    dest_block.children = store.copy_from_template(
                        source_blocks, dest_block.location, None, head_validation=True
                    )

    def list_available_problems(self,library_key,store):
        """
        List all known problems.
        Returns tuples of (ProblemLocator, display_name)
        """
        source_blocks=[]
        library = self._get_library(library_key,store)
        if library:
            ctr=1
            for child in library.children:
                childitem=store.get_item(child)
                source_blocks.extend([{"display_name": str(ctr)+". "+str(childitem.display_name.encode("utf-8")) , "value": child.block_id } ])
                ctr = ctr + 1
        return source_blocks

    @XBlock.json_handler
    def source_problem_values(self, data, suffix=""):
        """
        Return list of possible problems for self.select_problems
        """
        library_selected = data['source_library_id']
        store=modulestore() 
        all_problems = self.list_available_problems(library_selected,store)

        return all_problems

    
    def _get_library(self, library_key,store):
        """
        Given a library key like "library-v1:ProblemX+PR0B", return the
        'library' XBlock with meta-information about the library.

        A specific version may be specified.

        Returns None on error.
        """
        if not store:
             return None

        library = LibraryLocator.from_string(library_key)
        try:
            return store.get_library(
                library, remove_version=False, remove_branch=False, head_validation=False
            )
        except ItemNotFoundError:
            return None

    @property
    def source_library_key(self):
        """
        Convenience method to get the library ID as a LibraryLocator and not just a string
        """
        return LibraryLocator.from_string(self.source_library_id)

    def _get_original_child_blocks(self):
        """
        Generator returning XBlock instances of the children selected for the
        current user.
        """
        block_list = [(c.block_type, c.block_id) for c in self.children]
        #if not first attempt randomize the view of children
        
        # selected = set(block_list)
        for block in block_list:
            for block_type, block_id in set([block]):
                yield self.runtime.get_block(self.location.course_key.make_usage_key(block_type, block_id))
                pass

    
    def _get_selected_child_blocks(self):
        """
        Generator returning XBlock instances of the children selected for the
        current user.
        """
        block_list = [(c.block_type, c.block_id) for c in self.children]
        #if not first attempt randomize the view of children
        if self.first_attempt == 0:
            new_block_list=[]
            num_children =len(block_list)
            valid_values=all(x<=num_children for x in self.order_list)
            if not valid_values:
                None
            else:
                for value in self.order_list:
                   new_block_list.append(block_list[value])

        else:
            new_block_list = block_list

        # selected = set(block_list)
        for block in new_block_list:
            for block_type, block_id in set([block]):
                yield self.runtime.get_block(self.location.course_key.make_usage_key(block_type, block_id))
                pass

    def get_user_id(self):
        user_service = self.runtime.service(self, 'user')
        if user_service:
            # May be None when creating bok choy test fixtures
            user_id = user_service.get_current_user().opt_attrs.get('edx-platform.user_id', None)
        else:
            user_id = None
        return user_id


    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def randomize_children(self):

        init_order = range(0,len(self.children))
        if self.first_attempt == 1:
            self.order_list = init_order
        else:
            shuffle(init_order)
            self.order_list = init_order

    def save_score(self):
        score_list=[]
        for child in self._get_selected_child_blocks():
            if child.is_attempted():
                if child.is_correct():
                    score_list.append(1)
                else:
                    score_list.append(0)
        if self.first_attempt == 1:
            self.current_attempt_score.append(score_list)
            self.done = True
        else:
            t=[]
            t=self.order_list
            count=len(t)
            original_score_list=[0] * count
            ctr=0
            for indx in  range(0,count):
               original_score_list[self.order_list[indx]]=score_list[indx]
            print("original score_list===========================================" , original_score_list)
            
            self.current_attempt_score.append(original_score_list)

    def set_start_end_time(self, current_time):
        self.start_time = current_time
        start_time_obj = dt.strptime(self.start_time, DEFAULT_DATE_TIME_FORMAT)
        end_time_obj = start_time_obj + datetime.timedelta(minutes=self.timer)
        self.end_time = end_time_obj.strftime(DEFAULT_DATE_TIME_FORMAT)

    def time_up(self, current_time):
        if current_time > self.end_time:
            return True
        return False

    def reset_delay_elapsed(self, current_time):
        end_time_obj = dt.strptime(self.end_time, DEFAULT_DATE_TIME_FORMAT)
        required_delay_time_obj = end_time_obj + datetime.timedelta(hours=self.reset_delay)
        required_delay_time = required_delay_time_obj.strftime(DEFAULT_DATE_TIME_FORMAT)
        if current_time >= required_delay_time:
            return True
        return False

    def save_reattempt_problem_score(self):
        
        score_list=[]
        for child in self._get_original_child_blocks():
            is_correct = -1
            if child.is_attempted():
                if child.is_correct():
                    is_correct = 1
                else:
                    is_correct = 0

            score_list.append({
                "is_correct": is_correct,
                "ans_submitted": child.get_state_for_lcp()['student_answers'].values()
            })
        self.score_report = score_list
        print(self.score_report)

    
    
    def save_problem_score(self):
        
        score_list=[]
        for child in self._get_selected_child_blocks():
            is_correct = -1
            if child.is_attempted():
                if child.is_correct():
                    is_correct = 1
                else:
                    is_correct = 0

            score_list.append({
                "is_correct": is_correct,
                "ans_submitted": child.get_state_for_lcp()['student_answers'].values()
            })
        self.score_report = score_list
        print(self.score_report)

    @XBlock.json_handler
    def reset_attempt(self, reset_param, suffix=''):
        userid = None
        error_flag = False
        err_message = ""
        current_time = dt.now(timezone(DEFAULT_TIME_ZONE)).strftime(DEFAULT_DATE_TIME_FORMAT)

        if self.assessment_type == self.UNIT_TYPE["CME_TEST"]:
            if self.end_time != '':
                if not self.reset_delay_elapsed(current_time):
                    error_flag = True
                    err_message = "Re-attempt is not allowed."

        # Hariom - ET254_ECG_COMPETITION
        if self.assessment_type == self.UNIT_TYPE["ECG_COMPETITION"]:
            error_flag = True
            err_message = "Re-attempt is not allowed."

        if not error_flag:
            for child in self._get_selected_child_blocks():
                if not child.is_attempted():
                    error_flag = True
                    err_message = "All the problems are not attempted in the previous attempt."

        if not error_flag:
            user_service = self.runtime.service(self, 'user')
            if user_service:
                cur_user = user_service.get_current_user()

                user_email = cur_user.emails[0]

            else:
                error_flag = True
                err_message += " The user is not logged in"
                user_email = None

        if not error_flag:
            self.save_score()
            if self.assessment_type == self.UNIT_TYPE["CME_TEST"]:
                original_score_report=[{}   ]*len(self.order_list)
                ctr=0
                '''if self.first_attempt == 0:
                    for i in self.order_list:
                        original_score_report[i] =self.score_report[ctr]
                        ctr= ctr+1
                    self.attempt_score_history.append(original_score_report)
                else:'''
                self.attempt_score_history.append(self.score_report)

            loc = text_type(self.location)
            crsid = text_type(self.course_id)
            if user_email:
                try:
                    student = User.objects.get(email=user_email)
                except:
                    student = None
            else:
                student = None

            try:
                requester = User.objects.get(username="edx")
            except:
                try:
                    requester = User.objects.get(username="dev")
                except:
                    requester = None
        
            if student and requester:
                inst_service = InstructorService()
                
                for child in self._get_selected_child_blocks():
                    inst_service.delete_student_attempt(user_email, crsid, text_type(child.location), requester)

                self.first_attempt = 0
                self.randomize_children()
                self.attempt_no =self.attempt_no+1
                return {
                    'result': 'success',
                    'message': ''
                }
        else:
            pass

        return {
            'result': 'error',
            'message': err_message
        }
    

    @XBlock.json_handler
    def update_summary(self, updatestats, suffix=''):  # pylint: disable=unused-argument,no-self-use
        if not isinstance(updatestats, dict):
           LOG.error("updatestats is not a dict - %r", updatestats)
           return {
            'result': 'error'          
           }
        #test = CapaModule
        # test.submit_problem()
        
        
        with transaction.atomic():    

            # Hariom - ECG Competition changes
            current_time = dt.now(timezone(DEFAULT_TIME_ZONE)).strftime(DEFAULT_DATE_TIME_FORMAT)
            if self.assessment_type == self.UNIT_TYPE["ECG_COMPETITION"]:
                # if self.done == True:
                #     return {
                #         'result': 'error',
                #         'message': 'Only one attempt allowed for ECG Competition'
                #     }
                # current_time = dt.now(timezone(DEFAULT_TIME_ZONE)).strftime(DEFAULT_DATE_TIME_FORMAT)
                if updatestats.has_key('start_time'):
                    if updatestats['start_time'] and self.start_time == '' and self.end_time == '':
                        self.set_start_end_time(current_time)

            if updatestats.has_key('problem_state_id') and updatestats.get('problem_state_id') == None and self.first_attempt == 1:
                #self.complete =0.0
                try:
                    obj=BlockCompletion(user=student,course_key=self.course_id,block_key=self.location,block_type="assessmentxblock",completion=0.0)               
                    obj.save()
                    flag=2  
                except Exception as f:
                    flag=3
                    e=f
            children_list = []
            if updatestats.has_key('last_problem'):
                if updatestats['last_problem'] == True: 
                    if self.first_attempt == 1:
                        self.done=True
                    if (self.assessment_type ==self.UNIT_TYPE["CME_TEST"]):    
                        self.end_time = dt.now(timezone(DEFAULT_TIME_ZONE)).strftime(DEFAULT_DATE_TIME_FORMAT)
                    self.save_score()
            
            # save each problem score for competition until time out
            if self.assessment_type == self.UNIT_TYPE["ECG_COMPETITION"] and not self.time_up(current_time):
                self.save_score()
                self.save_problem_score()

            if self.assessment_type == self.UNIT_TYPE["CME_TEST"] :
                #self.save_score()
                if (self.attempt_no == 1):
                    self.save_problem_score()
                else:
                    print("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&")        
                    self.save_reattempt_problem_score()
                print("after save problem score")
            prob_id = None
            if updatestats.has_key('problem_state_id') and updatestats.get('problem_state_id') != None:
                prob_id = updatestats['problem_state_id'][10:]

            total_correct = 0
            total_incorrect = 0
            total = 0
            low = self.definitively_repeat
            high = self.continue_with_next
            
            final_val = ""
            final_ans = None
            ans = {}
            total_attempted=0
            for child in self._get_selected_child_blocks():
                
                # for displayable in child.displayable_items():
                # rendered_child = displayable.render(STUDENT_VIEW, child_context)
                # fragment.add_fragment_resources(rendered_child)
                
                state_lcp = child.get_state_for_lcp()
                if "correct_map" in state_lcp:
                    correct_map_keys =  list(state_lcp["correct_map"].keys())
                    
                    if(len(correct_map_keys) > 0):
                        new_id = correct_map_keys[0]
                        stud_state = state_lcp
                        if stud_state['done']:
                            try:
                                ans = child.get_answer("")
                                for key,value in ans['answers'].iteritems():
                                    if isinstance(value,list):
                                        final_val = ','.join(value)
                                    else:
                                        final_val = value
                            except:
                                pass
                        if(new_id == prob_id):
                            final_ans = final_val
                                            
                
                ans_attempted = child.is_attempted()
                # Hariom - ET254_ECG_COMPETITION
                if self.assessment_type == self.UNIT_TYPE["ECG_COMPETITION"] :
                    # set attempt to True if time is up or last_problem is True
                    if updatestats.has_key('last_problem'):
                        if updatestats['last_problem'] == True:
                            ans_attempted = True
                    curr_list = {"attempt": ans_attempted if not self.time_up(current_time) else True}
                else:
                    curr_list = {"attempt": ans_attempted, "correct": child.is_correct()}
                    if ans_attempted:
                        curr_list['ans'] = final_val
                children_list.append(curr_list)

                total = total + 1
                if child.is_attempted():
                    total_attempted = total_attempted +1
                if child.is_correct():
                    total_correct = total_correct + 1
                elif child.is_attempted():
                    total_incorrect = total_incorrect + 1
            if self.assessment_type == self.UNIT_TYPE["TRAINING"] and (total_correct + total_incorrect == 1) and self.first_attempt == True:
                self.start_time = current_time
            if updatestats.has_key('last_problem'):
                if updatestats['last_problem'] == True: 
                    if not self.end_time :
                        if  round(float(total_correct) / float(total) * 100, 2) >=  float(self.definitively_repeat):
                            self.end_time =current_time
            if total != 0:
                correct_percent = round(float(total_correct) / float(total) * 100, 2)
            else:
                correct_percent = 0
            
            if self.assessment_type == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:
                if correct_percent >= float(high):
                    status = self.next_unit_msg
                else:
                    status = self.can_repeat_msg    
            elif self.assessment_type == self.UNIT_TYPE["CME_TEST"]:
                if correct_percent >= float(high):
                    status = self.next_unit_msg
                else:
                    status = self.can_repeat_msg
            else:
                if correct_percent < float(low):
                    status = self.def_repeat_msg
                elif correct_percent >= float(high):
                    status = self.next_unit_msg
                else:
                    status = self.can_repeat_msg
            user_service = self.runtime.service(self, 'user')
            if user_service:
                cur_user = user_service.get_current_user()

                user_email = cur_user.emails[0]
                try:
                    student = User.objects.get(email=user_email)
                except:
                    student = None
            else:
                None
            lp=False
            flag=0
            e=None
            if prob_id:
                self.complete =0.5
            try:
                obj=BlockCompletion.objects.get(user=student,course_key=self.course_id,block_key=self.location,block_type="assessmentxblock")
                
            
                if updatestats.has_key('last_problem'):
                    lp=True
                    if self.assessment_type == self.UNIT_TYPE['TRAINING'] :
                        if updatestats['last_problem'] == True and  correct_percent >= float(low):
                            self.complete = 1.0
                        elif updatestats['last_problem'] == True and  correct_percent < float(low):
                            self.complete = 0.5
                    elif self.assessment_type == self.UNIT_TYPE['CME_TEST'] :
                        if updatestats['last_problem'] == True and  correct_percent >= float(high):
                            self.complete = 1.0
                        elif updatestats['last_problem'] == True and  correct_percent < float(high):
                            self.complete = 0.5
                    elif self.assessment_type == self.UNIT_TYPE['KNOWLEDGE_ACQ']:
                        
                        if updatestats['last_problem'] == True :
                            self.complete = 1.0
                            
                else:
                    if updatestats.has_key('problem_state_id') and updatestats.get('problem_state_id') != None:
                        self.complete= 0.5
                    
                if obj.completion < float(self.complete):
                    
                    obj.completion =float(self.complete)
                    obj.save()
                flag=1
            
            
            except Exception as e :
                try:
                    obj=BlockCompletion(user=student,course_key=self.course_id,block_key=self.location,block_type="assessmentxblock",completion=self.complete)               
                    obj.save()
                    flag=2  
                except Exception as f:
                    flag=3
                    e=f
 
        #obj,create=BlockCompletion.objects.get_or_create(user=student,course_key=self.course_id,block_key=self.location,block_type="assessmentxblock")
        
        details={
            "course_id": str(self.course_id),
            "block_id": str(self.parent),
            "complete": self.complete
        }
        #if comp != self.complete:
        result=send_course_progress(details,student,self.course_id,self.parent,self.complete,"assessmentxblock")

        # Start Hariom - ET-183_TOC_changes
        toc_progress = {
            "id": result["id"],
            "course_id": result["course_id"],
            "block_id": result["block_id"],
            "status": result["status"]
        }
        # End Hariom - ET-183_TOC_changes
        
        # Hariom - ET254_ECG_COMPETITION
        feedback_message = self.feedback_text_msg
        if updatestats.has_key('time_out'):
            if updatestats['time_out'] == True:
                feedback_message = self.timeout_feedback_text_msg

        allow_reattempt = None
        reattempt_delay = None
        if self.assessment_type == self.UNIT_TYPE["CME_TEST"]:
        	if self.end_time != '':
        		allow_reattempt = self.reset_delay_elapsed(current_time)
                reattempt_delay = self.reset_delay

        if self.current_problem != total_attempted:
            self.current_problem= total_attempted
            if self.assessment_type == self.UNIT_TYPE["TRAINING"] or self.assessment_type == self.UNIT_TYPE["CME_TEST"]:
                print self.start_time
                send_training_progress(student,self.course_id,self.parent,self.complete,total,total_correct,total_incorrect,True if self.first_attempt == 1 else False,self.start_time,self.end_time,self.assessment_type)

        '''if create:
            obj.completion=self.complete
            obj.save()
        else:
            obj.completion=self.complete
            obj.save()'''
        return {
            'result': 'success',
            'children_list': children_list,
            'total': total,
            'total_correct': total_correct,
            'correct_percent': round(correct_percent),
            'low': low,
            'high': high,
            'summary': status,
            'total_incorrect': total_incorrect,
            'answer': final_val,
            'answer_prob_state_id': prob_id,
            'complete': self.complete,
            'assessment_type': self.assessment_type,
            'parent': str(self.runtime.get_block(self.parent).children),
            'toc_progress': toc_progress,
            'allow_reattempt': allow_reattempt,
            'reattempt_delay': reattempt_delay
        } if self.assessment_type != self.UNIT_TYPE["ECG_COMPETITION"] else {   # Hariom - ET254_ECG_COMPETITION
            'end_time': self.end_time,
            'time_elapsed': True if self.time_up(current_time) else False,
            'feedback_header_msg': self.feedback_header_msg,
            'summary': feedback_message,
            'children_list': children_list,
            'total': total,
            'assessment_type': self.assessment_type,
            'parent': str(self.runtime.get_block(self.parent).children)
        }

    # Context argument is specified for xblocks, but we are not using herein
    def studio_view(self, context):  # pylint: disable=unused-argument
        """
        Editing view in Studio
        """
        #from xmodule.x_module import STUDENT_VIEW ,XModule
        store=modulestore()
        libt=LibraryToolsService(store)
        #lib_tools = self.runtime.service(self, 'library_tools')
        user_perms = self.runtime.service(self, 'studio_user_permissions')
        fragment = Fragment()
        plist =[]
        if self.source_library_id :
            pass
            plist=self.problem_list(self.source_library_id,libt,store)
        # Need to access protected members of fields to get their default value
        default_name = self.fields['display_name']._default  # pylint: disable=protected-access,unsubscriptable-object
        fragment.add_content(RESOURCE_LOADER.render_template("static/html/assessmentxblock_edit.html", {
            'self': self,
            'defaultName': default_name,
            'library_list': self.library_list(libt,user_perms),
            'problem_list': plist,
            # 'problem_list_encoded': str(plist).encode("utf-8"),
            'problem_list_encoded': json.dumps(plist),
             "temp":1
             
        }))

        fragment.add_css(self.resource_string("static/css/assessmentxblock.css"))

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
            fragment.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        fragment.add_javascript(RESOURCE_LOADER.load_unicode('static/js/src/assessmentxblock_edit.js'))
        fragment.initialize_js('AssesmentXBlock_Edit')


        return fragment

    @XBlock.json_handler
    def studio_submit(self, submissions, suffix=''):  # pylint: disable=unused-argument
        """
        Change the settings for this XBlock given by the Studio user
        """
        print submissions
        err_message = {}
        error_flag = False
        lib_tools = self.runtime.service(self, 'library_tools')
        user_perms = self.runtime.service(self, 'studio_user_permissions')
        store=modulestore()
        mandatory_fields = ['library', 'problems', 'feedback', 'assessment_type']
        text_fields=[]
        if int(submissions['feedback']) == 1:
            # Hariom - ET254_ECG_COMPETITION
            if submissions['assessment_type'] == self.UNIT_TYPE["ECG_COMPETITION"]:
                text_fields += ['timer', 'feedback_header_msg', 'feedback_text_msg', 'timeout_feedback_text_msg']
            elif submissions['assessment_type'] == self.UNIT_TYPE["CME_TEST"]:
                text_fields += ['reset_delay', 'can_repeat_msg', 'next_unit_msg']
            else:
                text_fields += ['can_repeat_msg', 'next_unit_msg']
                if not submissions['assessment_type'] == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:
                     text_fields += ['def_repeat_msg']

        if not isinstance(submissions, dict):
            LOG.error("submissions object from Studio is not a dict - %r", submissions)
            err_message['input'] ='submissions received not a dictionary'
        total_mandatory_fields= mandatory_fields + text_fields
        if bool(set(mandatory_fields) - set(submissions.keys())):
            err_message['block'] = 'Mandatory fields not present in the input'
            error_flag =True
        else:
            # Validation for blank values
            for field in mandatory_fields:
                if len(str(submissions[field]).strip()) <= 0:
                    error_flag = True
                    err_message[field] = "The {f} field is required".format(f=field.replace('_', ' '))
            for field in text_fields:
                if len(unicode(submissions[field])) <= 0:
                    error_flag = True
                    err_message[field] = "The {f} field is required".format(f=field.replace('_', ' '))              
            match= False
            lib_list= self.library_list(lib_tools,user_perms)
            for lib in lib_list:
                if lib['value']  == submissions['library']:
                    match = True
                    break
            if match:
                pass
                if submissions['library'] != "": 
                    problist = self.problem_list(submissions['library'],lib_tools,store)
                    values_list=[]
                    for prob in problist:
                        values_list.append(prob['value'])
                    new_problems = set(submissions['problems']) - set(values_list)
                    missing_problems = set(values_list) - set(submissions['problems'])

                    if not (bool(new_problems) and bool(missing_problems)):
                        pass
                    else:
                        error_flag = True
                        err_message['problems'] = ""
                        if bool(new_problems):
                            err_message['problems'] += "Some problems in problem list do not exist in library\n"
                        if bool(missing_problems):
                            err_message['problems'] += "Some problem are missing problems  in problem list \n"

            else:
                err_message['library'] = "Invalid Library Key"

            if submissions['feedback'] not in ['0','1']:
                err_message['feedback'] = " The  display feedback value is incorrect."
            else:
                pass

            # Hariom - ET254_ECG_COMPETITION
            if submissions['assessment_type'] == self.UNIT_TYPE["ECG_COMPETITION"]:
                if not err_message.has_key('timer'):
                    if int(submissions['timer']) < 1:
                        error_flag = True
                        err_message['timer'] = "Timer can not be less than 1 minute."
            elif submissions['assessment_type'] == self.UNIT_TYPE["CME_TEST"]:
                if not err_message.has_key('reset_delay'):
                    if int(submissions['reset_delay']) < 0:
                        error_flag = True
                        err_message['reset_delay'] = "Reset Attempt cannot be negative."
    
            else:
                if int(submissions['feedback']) == 1:
                    if set(['low', 'high']) - set(submissions.keys()):
                        error_flag =True
                        err_message['feedback_block'] = 'mandatory fields for feedback block not present'

                    
                        '''
                        if submissions['module_link'] != '':
                            try:

                               blk=self.runtime.get_block('video',submissions['module_link'])
                            except Exception as e:
                                err_message['module_link'] = e
                                blk =None
                            if blk:
                                pass
                            else:
                                error_flag = True
                                #err_message['module_link'] += "The link is not a valid video."
                        '''
                    err_message['definitively_repeat'] = ''
                    if not submissions['assessment_type'] == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:
                        if int(submissions['low']) == 0:
                            error_flag = True
                            err_message['definitively_repeat'] = "Minimum cutoff value has to be greater than zero."

                    if submissions['assessment_type'] == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:

                        if int(submissions['high']) == 0:
                            error_flag = True
                            err_message['continue_with_next'] = "Minimum cutoff value has to be greater than zero."
  
                    if int(submissions['high']) < 0 or int(submissions['high']) > 100:
                        error_flag = True
                        err_message['continue_with_next'] = "Enter valid number for continue with next value."
                    
                    if not submissions['assessment_type'] == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:
                        if int(submissions['low']) < 0 or int(submissions['low']) > 100:
                            error_flag = True
                            err_message['definitively_repeat'] = "Enter valid number for definitively repeat value."
                        
                        if int(submissions['low']) <= int(submissions['high']):
                            pass
                        else:
                            error_flag = True
                            err_message['definitively_repeat'] += " The definitively Repeat value has to be less than continue to next value."
                print(settings.LMS_ROOT_URL)
                value=submissions['module_link'].strip()
                if len(value) > 0:
                    if value[0] == '/':
                        modulelink=settings.LMS_ROOT_URL+str(submissions['module_link'].strip())
                    else:
                        modulelink=settings.LMS_ROOT_URL+'/'+str(submissions['module_link'].strip())
                    if len(str(submissions['module_link']).strip()) > 0:
                        regex = re.compile(
                            r'^(?:http|ftp)s?://' # http:// or https://
                            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|' #domain...
                            r'localhost|' #localhost...
                            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
                            r'(?::\d+)?' # optional port
                            r'(?:/.|[/.]\S+)$', re.IGNORECASE)
                        if not re.match(regex,modulelink):
                            error_flag = True
                            err_message['module_link'] = "Module link is not valid."    

        if not error_flag:
            self.display_name = unicode(submissions['display_name'])
            self.source_library_id = submissions['library']
            self.assessment_type = submissions['assessment_type']
            if (submissions['library']) != "":
                lib_tools = self.runtime.service(self, 'library_tools')
                self.source_library_version = lib_tools.get_library_version(self.source_library_id)
            self.problems = submissions['problems']
            self.display_feedback = int(submissions['feedback'])
            if self.display_feedback == 1:

                # Hariom - ET254_ECG_COMPETITION
                if submissions['assessment_type'] == self.UNIT_TYPE["ECG_COMPETITION"]:
                    self.timer = (submissions['timer'])
                    
                    self.feedback_header_msg = self.filterScriptTags(unicode(submissions['feedback_header_msg']))
                    self.feedback_text_msg = self.filterScriptTags(unicode(submissions['feedback_text_msg']))
                    self.timeout_feedback_text_msg = self.filterScriptTags(unicode(submissions['timeout_feedback_text_msg']))
                else:

                    if submissions['assessment_type'] == self.UNIT_TYPE["KNOWLEDGE_ACQ"]:
                        self.definitively_repeat = (submissions['high'])
                    else: 
                        self.definitively_repeat = (submissions['low'])
                        self.module_link = (submissions['module_link'])
                        self.def_repeat_msg = self.filterScriptTags(unicode(submissions['def_repeat_msg']))

                    if submissions['assessment_type'] == self.UNIT_TYPE["CME_TEST"]:
                        self.definitively_repeat = (submissions['high'])
                        self.reset_delay = (submissions['reset_delay'])

                    self.continue_with_next = (submissions['high'])
                    self.can_repeat_msg = self.filterScriptTags(unicode(submissions['can_repeat_msg']))
                    self.next_unit_msg = self.filterScriptTags(unicode(submissions['next_unit_msg']))

            user_id = self.get_user_id()
            self.children = []
            self.librarydetail(self.source_library_id, self.problems, user_id ,store)

            return {
                'result': 'success',
                'error_msg': {}
                }

        else:
            return {
                'result': 'error',
                'error_msg': err_message
            }


    def student_view(self, context):  # pylint: disable=unused-argument
        """
        Player view, displayed to the student
        """

        fragment = Fragment()
        contents = []
        child_context = {} if not context else copy(context)
        children_list=[]
        total_correct=0
        total_incorrect = 0
        total=0
        low=self.definitively_repeat
        high=self.continue_with_next
        t=None
        modulelink=self.module_link
        print(settings.LMS_ROOT_URL)
        value=self.module_link
        if len(value) > 0:
            if value[0] == '/':
                modulelink=settings.LMS_ROOT_URL+value
            else:
                modulelink=settings.LMS_ROOT_URL+'/'+value
                        
        

        fragment.add_content(RESOURCE_LOADER.render_django_template(
            'static/html/problem-lib.html',
            context={'self':self},
            i18n_service=self.runtime.service(self, 'i18n'),
        ))
        '''fragment.add_content(RESOURCE_LOADER.render_django_template(
            'static/html/add_next_button.html',
            context={"assessmentxblock": 1},
            i18n_service=self.runtime.service(self, 'i18n'),
        ))'''
        for child in self._get_selected_child_blocks():
            t = dir(child)
            

            for displayable in child.displayable_items():

                rendered_child = displayable.render(STUDENT_VIEW, child_context)
                fragment.add_fragment_resources(rendered_child)
                children_list.append({"attempt": child.is_attempted(),"correct":child.is_correct()})

                contents.append({
                    'id': text_type(displayable.location),
                    'content': rendered_child.content,
                })
            #last value should get end tag of unordered list
            total = total + 1

            if child.is_correct():
                total_correct = total_correct + 1
            elif child.is_attempted():
                total_incorrect = total_incorrect + 1

        fragment.add_content(self.system.render_template('vert_module.html', {
            'items': contents,
            'xblock_context': context,
            'show_bookmark_button': False,
            #'watched_completable_blocks': set(),
            'completion_delay_ms': None,
            "assessmentxblock": 1
        }))

        # str(contents[0].content)
        if total != 0:
            correct_percent = round(float(total_correct)/float(total)*100,2)

        else:
             correct_percent =0
        if correct_percent < float(low):
            status = self.def_repeat_msg
        elif correct_percent >= float(high):
            status = self.next_unit_msg
        else:
            status = self.can_repeat_msg
        fragment.add_content(RESOURCE_LOADER.render_django_template(
            ASSESSMENT_TEMPLATE,
            context={"self": self, "contents": contents,"children_list" :children_list, "total":total,"total_correct":total_correct,
                        'low':low, 'high':high, 'summary':status, 'correct_percent':correct_percent, 'total_incorrect': total_incorrect, "test": self.order_list, "has_staff_role": self.has_staff_role(),'modulelink':modulelink} 
                        if self.assessment_type != self.UNIT_TYPE["ECG_COMPETITION"] else { "self": self, "contents": contents,
                        'children_list': children_list, 'total': total ,'modulelink':modulelink},
            i18n_service=self.runtime.service(self, 'i18n'),
        ))
        fragment.add_javascript(RESOURCE_LOADER.load_unicode('static/js/src/vendor/jquery-ui/jquery-ui.min.js'))
        fragment.add_javascript(RESOURCE_LOADER.load_unicode('static/js/src/slick.min.js'))
        fragment.add_javascript(RESOURCE_LOADER.load_unicode('static/js/src/jquery.overlayScrollbars.js'))
        fragment.add_javascript(RESOURCE_LOADER.load_unicode('static/js/src/assessmentxblock.js'))
        fragment.add_javascript_url(
            self.runtime.local_resource_url(self, 'public/js/ecg_toolbar.js')
        )
        fragment.add_css(self.resource_string("static/css/assessmentxblock_edit.css"))

        fragment.initialize_js('AssesmentXBlock')
        #fragment.add_css(self.resource_string("static/css/slick1.css"))
        fragment.add_css(self.resource_string("static/css/OverlayScrollbars.min.css"))
        fragment.add_css(self.resource_string("static/css/assessmentxblock.css"))
        return fragment



    @staticmethod
    def _get_statici18n_js_url():
        """
        Returns the Javascript translation file for the currently selected language, if any.
        Defaults to English if available.
        """
        locale_code = translation.get_language()
        if locale_code is None:
            return None
        text_js = 'public/js/translations/{locale_code}/text.js'
        lang_code = locale_code.split('-')[0]
        for code in (locale_code, lang_code, 'en'):
            loader = ResourceLoader(__name__)
            if pkg_resources.resource_exists(
                    loader.module_name, text_js.format(locale_code=code)):
                return text_js.format(locale_code=code)
        return None


    @staticmethod
    def get_dummy():
        """
        Dummy method to generate initial i18n
        """
        return translation.gettext_noop('Dummy')

    def filterScriptTags(self, htmlTextStr):
        return (re.subn(r'<(script).*?</\1>(?s)', '', htmlTextStr))[0]

    
    @XBlock.json_handler
    def get_report(self, data, suffix=''):

        if not self.has_staff_role():
            return {}
        if (self.assessment_type == self.UNIT_TYPE["CME_TEST"]):
            print("inside if....")
            markslist = StudentModule.objects.filter(course_id=self.course_id,module_state_key=self.location)
            total_ques=len(self.children)
            
            rowmarks=[]
            for marks in markslist:
                details = userdetails.objects.filter(student=marks.student)
                if details:
                    unique_id=details[0].external_ref_id
                else:
                    unique_id =str(marks.student.id)
                rowmarks.append((unique_id,json.loads(marks.state)))
            print ("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
            print(rowmarks)
            print("######################################################################")
            return prepare_report(rowmarks, self.assessment_type, total_ques, text_type(self.course_id))
        course_id = text_type(self.course_id)
        course_key = CourseKey.from_string(course_id)
        
        location = text_type(self.location)
        usage_key = UsageKey.from_string(location)

        results = []
        total_ques = 0

        students_enrolled = CourseEnrollment.objects.filter(course=course_key, is_active=1)
        for student in students_enrolled:
            markslist = StudentModule.objects.filter(course_id=self.course_id,module_state_key=self.location,student=student.user)
            if markslist:
                    for s in markslist:
                        t=json.loads(s.state)
                        score = []
                        if t.has_key("score_report"):
                            score = t["score_report"]
                            total_ques = len(score)
                        results.append({
                            "score": score,
                            "email": s.student.email,
                            "start_time": t["start_time"]
                        })
        header = ["email", "start_time"]
        for i in range(total_ques):
            header.append("Problem " + str(i + 1) + " score")
            header.append("Problem " + str(i + 1) + " response")

        csvData = [header]
        for result in results:
            row = []
            row.append(result["email"])
            row.append(result["start_time"])
            for sc in result["score"]:
                curr_score = sc["is_correct"]
                if curr_score == -1:
                    row.append("Not attempted")
                    row.append("NA")
                else:
                    if curr_score == 1:
                        row.append("correct")
                    else:
                        row.append("incorrect")
                    if type(sc["ans_submitted"][0]) == type([]):
                        for op in range(len(sc["ans_submitted"][0])):
                            try:
                                sc["ans_submitted"][0][op] = str(int(sc["ans_submitted"][0][op].split("_")[-1]) + 1)
                            except:
                                pass
                        row.append(",".join(sc["ans_submitted"][0]))
                    else:
                        row_val = sc["ans_submitted"][0]
                        pattern = re.compile("choice_[0-9]+")
                        if pattern.match(row_val):
                            row_val = str(int(row_val.split("_")[-1]) + 1)
                        row.append(row_val)
            csvData.append(row)

        return {
            "results": csvData,
            "course": course_id
        }

    def has_staff_role(self):

        is_staff = False
        user_service = self.runtime.service(self, 'user')
        if user_service:
            cur_user = user_service.get_current_user()
            is_staff = cur_user.opt_attrs.get("edx-platform.user_is_staff")

        return is_staff

