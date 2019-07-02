/* Javascript for AssesmentXBlock. */
function AssesmentXBlock_Edit(runtime, element) {
    console.log("libProblems");
    
    var LibhandlerUrl = runtime.handlerUrl(element, 'source_library_values');
    var ProbhandlerUrl = runtime.handlerUrl(element, 'source_problem_values');
    var handlerUrl = runtime.handlerUrl(element, 'studio_submit');

    libProblems.init();

    $("#problems-submit-options").on('click', function () {
        libProblems.saveEditing(handlerUrl);
    });

    $("#cancel_button").on('click', function () {
        runtime.notify('cancel', {});
    });

    libProblems.togglefeedbackparameters();
    
    $("#edit_display_feedback").change(libProblems.togglefeedbackparameters);

    
    $("#edit_library_options").change(function() {
        var selectedVal = $("#edit_library_options").val().trim();
        var defaultVal = $(this).data('default-value').trim();
        var listEl = $("ul.lib-problems-draggable123");
        
        if (selectedVal == defaultVal) {
            var listElDefVal = listEl.data('default-value');
            libProblems.addProblemsplaceholder(listElDefVal);
        } else if (selectedVal != ""){
            libProblems.fetchProblems(ProbhandlerUrl, $(this));
            var el = $(this);
            var clr = $("#clear_library");
            var default_val = el.data('default-value');
            clr.removeClass("inactive");
            if(el.val() == default_val) {
                clr.addClass("inactive");
            }
        } else {
            listEl.find('li').remove();
        }
    });
        
    
    
    libProblems.addDragable();

}

var libProblems = {

    init: function () {
        this.registerAssessmentTypeChange();
        
        this.checkCurrAssessmentType($("#edit_assessment_type"), this);

        this.registerResetFields();
    },

    addDragable: function () {
        $('.draggable ul').sortable({
            change: function () {
                $(".action.clear_problems").removeClass('inactive');
            }
        });
    },

    toggleClearTextbox: function(el,clear_button) {
        if(el.length > 0) {
            var default_value = el.data('default_value');
            var curr_val = el.val();
            if (curr_val == default_value) {
                clear_button.addClass('inactive')
            } else {
                clear_button.removeClass('inactive')
            }
        }
    },
    SetTextboxtoDefault: function(clear_button, el, init_value ="") {

        var valtochange = "";

        if (init_value != el.data('default-value')) {
            valtochange=init_value;
            }
        else {
            valtochange =el.data('default-value');
        }

        if(el.length > 0) {
            el.val(valtochange);
            clear_button.addClass('inactive');
        }
    },

    saveEditing: function(handlerUrl){
        value1 = $("#edit_display_name").val();

        var data = {
            'display_name': $("#edit_display_name").val(),
            'library': $("#edit_library_options").children("option:selected").val(),
            'assessment_type': $("#edit_assessment_type").children("option:selected").val(),
            'problems': libProblems.getProblemsList(),
            'feedback': $("#edit_display_feedback").children("option:selected").val(),
            'low': $("#edit_definitively_repeat").val(),
            'high': $("#edit_continue_with_next").val(),
            'module_link': $("#edit_module_link").val(),
            'def_repeat_msg': $("#edit_def_repeat_msg").val(),
            'can_repeat_msg': $("#edit_can_repeat_msg").val(),
            'next_unit_msg': $("#edit_next_unit_msg").val(),
            'timer': $("#edit_timer").val(),
            'reset_delay': $("#edit_reset_delay").val(),
            'feedback_header_msg': $("#edit_feedback_header_msg").val(),
            'feedback_text_msg': $("#edit_feedback_text_msg").val(),
            'timeout_feedback_text_msg': $("#edit_timeout_feedback_text_msg").val()
        };
        console.log(data)
        if (data['low'] == ""){
           data['low'] =0
        }
        if (data['high'] == ""){
           data['high'] =0
        }
        
        var errorMsgWrapper = $('.xblock-editor-error-message');
        var that = this;
        $.post(handlerUrl, JSON.stringify(data)).done(function(response) {
            if (response.result === 'success') {
                that.clearErrorMsgs(errorMsgWrapper);
                window.location.reload(false);
            } else {
                var error_msgs = response.error_msg;    
                that.clearErrorMsgs(errorMsgWrapper);
                errorMsgWrapper.html("");
                for (var key in error_msgs) {
                    $('#edit_' + key).addClass('is-error');
                    errorMsgWrapper.append("<li>" + error_msgs[key] + "</li>");
                }
            }

        });
    },
    clearErrorMsgs: function (errorMsgWrapper) {
        $('.assessmentxblock_block').find('.is-error').each(function () {
            $(this).removeClass('is-error');
        });
        errorMsgWrapper.html("");
    },
    togglefeedbackparameters: function () {
        var show_feedback = $("#edit_display_feedback").val();

        if (show_feedback == "0") {
            $(".feedback-parameters").hide();
        }
        else {
            $(".feedback-parameters").show();
        }
    }, 
    addProblemsplaceholder: function (result) {
        var listEl = $("ul.lib-problems-draggable123");
        listEl.find('li').remove();
        // listEl.prop('data-default-value', JSON.stringify(result));
        $.each(result, (_key, obj) => {
            listEl.append("<li data-problem-id=" + obj.value +">" + obj.display_name +"</li>");
        });
    },
    fetchProblems: function(ProbhandlerUrl, el) {
        var data = {
            type: "POST",
            url: ProbhandlerUrl,
            data: JSON.stringify({"source_library_id": el.val()}), 
            success: (response) => {
                libProblems.addProblemsplaceholder(response);
            }
        };
        $.ajax(data);
    },
    getProblemsList: function() {
        var list = [];
        $(".lib-problems-draggable123 li").each(function () {
            list.push($(this).data('problem-id'));
        });

        return list;
    }, 

    registerAssessmentTypeChange: function () {
        var that = this;
        
        $("#edit_assessment_type").change(function () {
            that.checkCurrAssessmentType($(this), that)
        })
    },

    checkCurrAssessmentType: function (el, that) {
        var currType = el.val();
        
        // By default, ECG Competition fields are hidden
        that.showEcgCompFields(false);
        if (currType == 'ecg_competition') {
            that.showEcgCompFields(true);
        }
        else if (currType == 'cme_test'){
            that.showCmeTestFields(true);

        }
        
        else {
            if (currType == 'knowledge_acquisition' ) {
                that.showKnowAcqFields(false);
            } else {
                that.showKnowAcqFields(true);
            }

        }

    },

    showCmeTestFields: function (show) {
        fbWrapper = $(".editor_content_wrapper ul.settings-list .feedback-parameters");

        defRepeatEl = fbWrapper.find(".def-repeat-wrapper");
        moduleLinkEl = fbWrapper.find(".module-link-wrapper");
        defRepeatMsgEl = fbWrapper.find(".def-repeat-msg-wrapper");
        timerEl = fbWrapper.find(".timer-wrapper");
        reset_attemptEl = fbWrapper.find(".reset_delay-wrapper");

        if (show) {
            defRepeatEl.addClass("hide");
            moduleLinkEl.addClass("hide");
            defRepeatMsgEl.addClass("hide");
            reset_attemptEl.removeClass("hide");
        }
        else {
            defRepeatEl.removeClass("hide");
            moduleLinkEl.removeClass("hide");
            defRepeatMsgEl.removeClass("hide");
            reset_attemptEl.addClass("hide");
        }

    },

    showKnowAcqFields: function (show) {
        fbWrapper = $(".editor_content_wrapper ul.settings-list .feedback-parameters");

        defRepeatEl = fbWrapper.find(".def-repeat-wrapper");
        moduleLinkEl = fbWrapper.find(".module-link-wrapper");
        defRepeatMsgEl = fbWrapper.find(".def-repeat-msg-wrapper");
        timerEl = fbWrapper.find(".timer-wrapper");
        reset_attemptEl = fbWrapper.find(".reset_delay-wrapper");
        if (show) {
            defRepeatEl.removeClass("hide");
            moduleLinkEl.removeClass("hide");
            reset_attemptEl.addClass("hide");
        } else {
            defRepeatEl.addClass("hide");
            moduleLinkEl.addClass("hide");
            defRepeatMsgEl.addClass("hide");
            reset_attemptEl.addClass("hide")

        }

    },

    showEcgCompFields: function (show) {
        fbWrapper = $(".editor_content_wrapper ul.settings-list .feedback-parameters");

        defRepeatEl = fbWrapper.find(".def-repeat-wrapper");
        contNextEl = fbWrapper.find(".cont-next-wrapper");
        moduleLinkEl = fbWrapper.find(".module-link-wrapper");
        defRepeatMsgEl = fbWrapper.find(".def-repeat-msg-wrapper");
        canRepeatMsgEl = fbWrapper.find(".can-repeat-msg-wrapper");
        nextUnitMsgEl = fbWrapper.find(".next-unit-msg-wrapper");
        timerEl = fbWrapper.find(".timer-wrapper");
        feedbackHeaderMsgEl = fbWrapper.find(".feedback-header-msg-wrapper");
        feedbackTxtMsgEl = fbWrapper.find(".feedback-text-msg-wrapper");
        timeoutFeedbackTxtMsgEl = fbWrapper.find(".timeout-feedback-text-msg-wrapper");
        reset_attemptEl = fbWrapper.find(".reset_delay-wrapper");
        if (show) {
            defRepeatEl.addClass("hide");
            contNextEl.addClass("hide");
            moduleLinkEl.addClass("hide");
            defRepeatMsgEl.addClass("hide");
            canRepeatMsgEl.addClass("hide");
            nextUnitMsgEl.addClass("hide");
            timerEl.removeClass("hide");
            feedbackHeaderMsgEl.removeClass("hide");
            feedbackTxtMsgEl.removeClass("hide");
            timeoutFeedbackTxtMsgEl.removeClass("hide");
            reset_attemptEl.addClass("hide");
            timerEl.removeClass("hide")
        } else {
            contNextEl.removeClass("hide");
            canRepeatMsgEl.removeClass("hide");
            nextUnitMsgEl.removeClass("hide");
            timerEl.addClass("hide");
            feedbackHeaderMsgEl.addClass("hide");
            feedbackTxtMsgEl.addClass("hide");
            timeoutFeedbackTxtMsgEl.addClass("hide");
        }

    },

    registerResetFields: function () {
        var inactiveClass = 'inactive';

        $(".reset-btn").click(function () {
            var btn = $(this);
            var el = btn.parent().find(".reset-me");
            var defaultVal = el.data('default-value');
            el.val(defaultVal).change();
            btn.addClass(inactiveClass)
        });

        $(".reset-me").on("keyup change", function () {
            var el = $(this);
            var elVal = el.val();
            var defaultVal = el.data('default-value');
            var resetBtn = el.parent().find('.reset-btn');

            if (elVal != defaultVal) {
                resetBtn.removeClass(inactiveClass);
            } else {
                resetBtn.addClass(inactiveClass);
            }
        });
    }
    
}

