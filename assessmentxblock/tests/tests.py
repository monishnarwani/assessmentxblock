import pytest
from django.test.utils import override_settings
from django.test import  TestCase
from django.conf import settings
from assessmentxblock.reports import prepare_report
"""
To run the script on
devstack  py.test /edx/src/edx_training/assessment-xblock/assessmentxblock/tests/tests.py
prodstack py.test /openedx/requirements/edx_training/assessment-xblock/assessmentxblock/tests/tests.py
"""
sample_marklists= [(u'aefbecef-4fe9-4531-80b0-a595db1c38ce', {u'complete': 1.0, u'current_problem': 4, u'score_report': [{u'is_correct': 1, u'ans_submitted': [[u'choice_0', u'choice_3']]}, {u'is_correct': 1, u'ans_submitted': [u'choice_1']}, {u'is_correct': 1, u'ans_submitted': [u'[366,161]']}, {u'is_correct': 1, u'ans_submitted': [[u'choice_0', u'choice_3']]}], u'done': True, u'end_time': u'2019-05-29T10:00:09Z', u'current_attempt_score': [[1, 1, 1, 1]]}), ('9', {u'attempt_no': 3, u'complete': 0.5, u'current_problem': 4, u'score_report': [{u'is_correct': 1, u'ans_submitted': [u'choice_1']}, {u'is_correct': 0, u'ans_submitted': [u'[208,257]']}, {u'is_correct': 1, u'ans_submitted': [[u'choice_0', u'choice_3']]}, {u'is_correct': 0, u'ans_submitted': [[u'choice_1', u'choice_2']]}], u'attempt_score_history': [[{u'is_correct': 0, u'ans_submitted': [[u'choice_0', u'choice_1']]}, {u'is_correct': 0, u'ans_submitted': [u'choice_2']}, {u'is_correct': 0, u'ans_submitted': [u'[259,197]']}, {u'is_correct': 0, u'ans_submitted': [[u'choice_2']]}], [{u'is_correct': 1, u'ans_submitted': [[u'choice_0', u'choice_3']]}, {u'is_correct': 0, u'ans_submitted': [u'choice_2']}, {u'is_correct': 0, u'ans_submitted': [u'[261,274]']}, {u'is_correct': 0, u'ans_submitted': [[u'choice_2']]}]], u'order_list': [1, 2, 3, 0], u'done': True, u'end_time': u'2019-06-10T05:52:02Z', u'current_attempt_score': [[0, 0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [0, 1, 0, 1]], u'first_attempt': 0})]

test_data=[([],"cme_test",4,"course-v1:Test+Test+2019_BO",{"course": "course-v1:Test+Test+2019_BO","results":[["Unique Identifier","attempt_no","Problem 1 score","Problem 1 response","Problem 2 score","Problem 2 response","Problem 3 score","Problem 3 response","Problem 4 score","Problem 4 response"]]}),
           (sample_marklists,"cme_test",4,"course-v1:Test+Test+2019_BO",{"course": "course-v1:Test+Test+2019_BO","results":[["Unique Identifier","attempt_no","Problem 1 score","Problem 1 response","Problem 2 score","Problem 2 response","Problem 3 score","Problem 3 response","Problem 4 score","Problem 4 response"]]})]
@pytest.mark.parametrize("markslist ,ab_type,total_ques,course_id,expected_output",test_data)
def test_prepare_report(markslist ,ab_type,total_ques,course_id,expected_output):
    print(expected_output)
    actual_output= prepare_report(markslist ,ab_type,total_ques,course_id)
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    print actual_output
    
    if len(expected_output) == len(actual_output):
       assert all(v == actual_output[k] for k,v in expected_output.iteritems())
    else:
       assert  len(expected_output) == len(actual_output)

