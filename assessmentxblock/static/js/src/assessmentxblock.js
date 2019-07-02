/* Javascript for AssesmentXBlock. */
function AssesmentXBlock(runtime, element) {
    var UpdateStatsUrl = runtime.handlerUrl(element, 'update_summary');
    var ResethandlerUrl = runtime.handlerUrl(element, 'reset_attempt');
    var GetReportUrl = runtime.handlerUrl(element, 'get_report');
    
    assessmentPlayer.init(UpdateStatsUrl, GetReportUrl);
    $('#reattempt').on('click', ResetBlock);
    if ($(".preview-specific-student-notice").length > 0)
    {
       $(".problem").addClass("read-only");
       console.log("I am trying")
    }
     
    function test123(result) {
        location.reload();
    }
    
    function ResetBlock() {
        $.ajax({
            type: "POST",
            url: ResethandlerUrl,
            data: JSON.stringify({
                "hello": "world"
            }),
            success: test123
        });

    }
}

var problems = ["123"];
// var customProb = new Problem();
var assessmentPlayer = {

    UpdateStatsUrl: null,
    responseData: null,
    isFirstCall: true,
    hasFeedbackBlock: false,
    playerCount: {
        currentCount: 0,
        totalCount: 1,
    },
    isSubmitted: false,
    progressScrollbar: null,

    init: function (UpdateStatsUrl, GetReportUrl) {
        this.UpdateStatsUrl = UpdateStatsUrl;
        this.GetReportUrl = GetReportUrl;
        
        this.addImageZoomClass();
        this.toggleImageZoomClass();
        if ($(".xblock-student_view-assessmentxblock").data("runtime-class") == "LmsRuntime") {
            this.hideCourseNav();
            this.initializeSlider();
            this.addFeedbackBlockToSlider();
            this.updateStatistics();

            this.registerSubmitBtnClick();
            this.registerCoursewareList();
            // this.registerNextUnitBtnClick();
            this.initializeDownloadReport(GetReportUrl);
        }
    },



    updateStatistics: function (isTimeout) {
        if (!isTimeout) {
            isTimeout = false
        }
        var that = this;
        var feedbackCount = (this.hasFeedbackBlock) ? 1 : 0;
        var isLast = (that.playerCount.currentCount == (that.playerCount.totalCount - feedbackCount));
        var postData = {
            update: true,
            // toc_progress: that.sendTOCProgressDetails(),
        };

        if (this.isFirstCall) {
            postData['problem_id'] = null;
            postData['problem_state_id'] = null;
            postData['start_time'] = true;
        } else {
            // change here for multiple assessmentPlayer
            postData['problem_id'] = $('div.slick-active .xblock-student_view-problem').data("request-token");
            postData['problem_state_id'] = $(".slick-active.slick-current .problem ").find("[id^=inputtype]").prop("id");
            postData['last_problem'] = isLast || isTimeout;
            postData['time_out'] = isTimeout;
        }

        $.ajax({
            type: "POST",
            url: that.UpdateStatsUrl,
            data: JSON.stringify(postData),
            error: function () {
                console.log("Error in updating");
            },
            success: function (response) {
                that.responseData = response;

                that.updateFeedbackBlock(response)
                that.updateSlickDots(response);
                that.updateStatusToProblemBlock(response);
                that.registerNextBtnClick();
                that.hideNextBtn(response);
                that.checkIfAttemptedAllProb(response);
                
                if (that.isFirstCall) {
                    // End Hariom : ET-281 changes
                    that.modifyLayoutOfSlickDots();
                    that.updateAfterSlideChange(that.responseData);
                    that.addSlideCountInNav();
                    that.navigateToLastAttemptQues();

                    // commenting resize function for now as design changed
                    that.updateSlickDotsWidthOnResize(that.responseData);
                    that.registerD2DNextBtn();
                    if (response.assessment_type == "ecg_competition") {
                        that.startTimer(response.end_time, response.time_elapsed);
                    } else {
                        that.displayShowedAns(that.responseData);
                    }
                } else {
                    that.addImageZoomClass(2);
                }
                // Internal show answer is called instead
                // else {
                //     that.showAnswer(response);
                // }
                that.isFirstCall = false;
                that.slider.trigger("assessment_block:updated");
                // Start Hariom : ET-183_TOC_changes
                if (response.assessment_type != "ecg_competition") {
                    that.updateTOCProgressIcon(response.toc_progress);
                }
                // End Hariom : ET-183_TOC_changes
            }
        });

    },



    updateFeedbackBlock: function (response) {
        totalEl = $(".pager-count .total-count");
        problemsPassEl = $(".problems-passed");
        problemsFailEl = $(".problems-failed");
        rangeEl = $('.score-wrapper .correcr-range');
        summary = $('.feedback-block .message').html(response.summary);
        feedback_header_msg = $('.ecg_competition .feedback-block h2').html(response.feedback_header_msg);

        rangeEl.css({
            "width": response.correct_percent + "%"
        });
        rangeEl.children('span').text(response.correct_percent + "%");
        totalEl.each(function (_index) {
            $(this).text(response.total);
        });

        $('.pager-count .correct-count').text(response.total_correct);
        $('.pager-count .incorrect-count').text(response.total_incorrect);

        problemsPassEl.text(response.total_correct);
        problemsFailEl.text(response.total_incorrect);

        this.updateButtonsWrapper(response);

        if (response.assessment_type == "ecg_competition") {
            $(".feedback-summary").html(response.summary);
        }
    },

    updateButtonsWrapper: function (response) {
        var videoLinkEl = $(".buttons-wrapper .video-link");
        var reattemptProbEl = $(".buttons-wrapper .reattempt-problems");
        var viewProgressEl = $(".buttons-wrapper .view-progress");
        var nextUnitEl = $(".buttons-wrapper .next-unit");
        var hideClass = "hide";
        var highlightBtnClass = "btn-highlight";
        var currStatus = "";
        // if (videoLinkEl.val() == "") {
        //     videoLinkEl.attr('disabled', true);
        //     videoLinkEl.addClass("diabled")
        // }
        if (response.correct_percent >= response.high) {
            // continue with next
            // show View Progress & Next Unit

            currStatus = "cont-next";
            videoLinkEl.addClass(hideClass);
            if (response.assessment_type == "cme_test") {
                reattemptProbEl.addClass(hideClass);
            }
            viewProgressEl.removeClass(hideClass);
            nextUnitEl.removeClass(hideClass);
            if (!nextUnitEl.hasClass('disabled')) {
                nextUnitEl.addClass(highlightBtnClass);
            }
            reattemptProbEl.removeClass(highlightBtnClass);
        } else if (response.correct_percent >= response.low && response.assessment_type != "cme_test") {
            // can repeat
            // Repeat this Unit, Next Unit

            currStatus = "can-repeat";
            videoLinkEl.addClass(hideClass);
            viewProgressEl.addClass(hideClass);
            nextUnitEl.removeClass(hideClass);
            nextUnitEl.addClass(highlightBtnClass);
            reattemptProbEl.removeClass(highlightBtnClass);
        } else {
            // definitively repeat
            // Link to Video, Repeat this Unit

            currStatus = "def-repeat";
            videoLinkEl.removeClass(hideClass);
            reattemptProbEl.addClass(highlightBtnClass);
            viewProgressEl.addClass(hideClass);
            if (response.assessment_type == 'knowledge_acquisition' || response.assessment_type == 'training') {
                nextUnitEl.removeClass(hideClass);
            } else {
                nextUnitEl.addClass(hideClass);
            }
            nextUnitEl.removeClass(highlightBtnClass);
        }

        if (response.assessment_type == "cme_test") {
            if (response.allow_reattempt !== null) {
                if (response.allow_reattempt) {
                    reattemptProbEl.attr("disabled", false);
                    reattemptProbEl.removeClass("disabled").addClass(highlightBtnClass);
                    reattemptProbEl.text("Test wiederholen");
                } else {
                    reattemptProbEl.attr("disabled", true);
                    if (response.reattempt_delay !== null && response.reattempt_delay != 0) {
                        reattemptProbEl.text("In " + response.reattempt_delay + " Stunden wiederholen");
                    }
                    reattemptProbEl.addClass("disabled").removeClass(highlightBtnClass);
                }
            }
        }

        // start Hariom : ET-325 changes
        // redirect to next unit page
        nextUnitEl.on("click", function() {
            var this_unit = $(document.getElementById(response.toc_progress.block_id)).parents(".vertical");
            if (this_unit.length != 0) {
                var next_unit = this_unit.next(".vertical");
                if (next_unit.length != 0) {
                    var next_unit_atag = next_unit.find("a");
                    if (next_unit_atag.length != 0) {
                        window.location.href = next_unit_atag.attr("href");
                    }
                }
                else {
                    $(".sequence-nav .sequence-nav-button.button-next").click();
                }
            }
        });
        // end Hariom : ET-325 changes

        // When all questions are attempted
        if ((response.total_correct + response.total_incorrect) == response.total) {
            // adding status summary in feedback wrapper
            $(".feedback-block").addClass(currStatus);
        }

    },

    updateSlickDots: function (response) {
        var childList = response.children_list;
        var slickDots = $("ul.slick-dots li");

        total = slickDots.length;
        slickDots.each(function (index) {
            if (index < total) {
                if (childList[index] && childList[index]['attempt'] == true) {
                    $(this).addClass('attempted');
                    if (response.assessment_type == "knowledge_acquisition" || response.assessment_type == "training") {
                        if (childList[index]['correct'] == true || childList[index]['correct']== false ) {
                            if (childList[index]['correct'] == true) {
                                $(this).addClass('correct');
                            } else if (childList[index]['correct'] == false)  {
                                $(this).addClass('wrong');
                            }
                        }
                    }
                }
            }

        });
    },

    updateStatusToProblemBlock: function (response) {
        var childList = response.children_list;
        $(".assessment-block .vert.slick-slide").each(function (index) {
            var problemEl = $(this).find(".problems-wrapper");
            if (problemEl) {
                if (childList[index] && childList[index]['attempt']) {
                    problemEl.addClass('attempted');

                    if (childList[index]['correct']) {
                        problemEl.addClass('correct');
                    } else {
                        problemEl.addClass('wrong');
                    }
                }
            }
        })
    },

    registerSubmitBtnClick: function () {
        var that = this;
        var submitBtn = $(".action button.submit ");
        $('.problems-wrapper').add(".xblock-student_view-drag-and-drop-v2").on('contentChanged', function () {
            that.setHeightAndEnableNext(that, this);
            setTimeout(function() {
                $("#main").trigger("AssessmentXBlock:problemSubmited");
            }, 2000);
        });
    },

    setHeightAndEnableNext: function (that, el) {

        //$(".assessment-block .slick-list").outerHeight($(".assessment-block .vert.slick-active").outerHeight() + 22);

        // Re-render contents of DOM
        // var contents = $("div.slick-active").html();
        // $("div.slick-active").html("");
        // $("div.slick-active").html(contents);

        that.isSubmitted = true;
        that.updateStatistics();
        that.enableNextSlickActiveDot();
        that.enableNextArrow();


        if (that.playerCount.currentCount == 0 || that.playerCount.currentCount < (that.playerCount.totalCount - 1)) {
            that.enableNextBtn($(el));
        } else if (that.playerCount.currentCount == that.playerCount.totalCount - 1) {
            that.enableFeedbackNav();
            clearInterval(this.intervalId);
            that.disableAllSubmitBtn();
        }
    },

    registerNotificationHandler: function () {

        var notiSaveEl = $('.notification');
        var increaseHeightBy = 24;
        notiSaveEl.each(function (index) {
            var el = $(this).parentsUntil('.problems-wrapper').find('.notification')
            if (el.is(':visible')) {
                increaseHeightBy = Math.max(increaseHeightBy, $(this).height())
            }
        });
        // var messageElement = $('span.message');
        // messageElement.each(function (index) {
        //     console.log('span.message', $(this), $(this).height());
        // });
    },

    initializeSlider: function () {
        this.slider = $('.xblock-student_view .slider .vert-mod');

        // this.slider.on("init", function () {
        //     console.log($(".problem"));
        // });

        // this.slider.on("reInit", function () {
        //     console.log($(".problem"));
        // });
        this.slider.slick({
            nextArrow: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
            prevArrow: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            dots: true,
            infinite: false,
            speed: 500,
            cssEase: 'linear',
            fade: true,
            draggable: false,
            adaptiveHeight: true,
            swipe: false
        });

        this.addClassToImageLabels();
    },

    modifyLayoutOfSlickDots: function () {
        var wrapper = $(".assessment-block.slider.feedback");
        var that = this
        if (wrapper) {

            wrapper.find(".slick-dots").after('<div class="feedback-label-wrapper"><button class="feedback-label">Feedback</button></div>');

            wrapper.find('.feedback-label-wrapper').click(function () {
                that.slider.slick('slickGoTo', that.slider.slick("getSlick").slideCount - 1);
            });
        }

    },

    addFeedbackBlockToSlider: function () {
        var feedbackBlock = $('.assessment-block.feedback .assessmentxblock_block');

        if (feedbackBlock.length) {
            this.hasFeedbackBlock = true
            this.slider.slick('slickAdd', feedbackBlock);
            this.slider.slick('refresh');
            this.playerCount.totalCount = this.slider.slick("getSlick").slideCount;
        }
    },


    addSlideCountInNav: function () {
        // This is only for desktop
        // var defaultCount = 1;
        // var countEl = `
        //     <li class="desktop pager-count">
        //         <span class="current-count">${defaultCount}</span> 
        //         /
        //         <span class="total-count">${this.responseData.total}</span>
        //     </li>
        // `;
        // $('.slick-dots').append(countEl);

        // This is only for mobile
        var mobCountEl = '<div class="mobile pager-count">';
        mobCountEl += '<span class="correct-count">' + this.responseData.total_correct + '</span>';
        mobCountEl += '/<span class="incorrect-count">' + this.responseData.total_incorrect + '</span>';
        mobCountEl += '/<span class="total-count">' + this.responseData.total + '</span></div>';
        

        $('.assessment-block .slick-slider').append(mobCountEl);

    },

    toggleFeedbackActiveClass: function (show) {
        if (show) {
            $(".feedback-label-wrapper").addClass("active-feedback");
        } else {
            $(".feedback-label-wrapper").removeClass("active-feedback");
        }
    },

    updateAfterSlideChange: function (responseData) {
        var that = this;
        this.slider.on('afterChange', function (event, slick, currentSlide) {
            $("#main").trigger("AssessmentXBlock:slideChanged");
            that.playerCount.totalCount = slick.slideCount;
            that.playerCount.currentCount = currentSlide + 1;

            if (responseData && (currentSlide == responseData.total)) {
                // $(".pager-count .current-count").text("Feedback");
                that.enableFeedbackNav();
                that.toggleFeedbackActiveClass(true);
            } else {
                // $(".pager-count .current-count").text(currentSlide + 1);
                if (!responseData.children_list[currentSlide].attempt) {
                    that.disableNextArrow();
                } else {
                    that.enableNextArrow();
                }
                that.toggleFeedbackActiveClass(false);
            }


            if ($("div.slick-current").find(".next").is(":visible")) {
                that.enableNextArrow();
            }
            that.addImageZoomClass(3);
        });
    },

    updateSlickDotsWidth: function() {
        var fbDotWidth = 0;
        var currWidth = window.innerWidth;
        var wrapper = $(".assessment-block.slider");
        var slickDotsEl = wrapper.find(".slick-dots");
        // var slickDotWidth = slickDotsEl.find("li").outerWidth(true);
        var slickDotWidth = 38;
        var dotsWrapperWidth = slickDotsEl.outerWidth(true) - (240); // 110 * 2 + 20
        
        if (slickDotsEl.hasClass('dots-small')) {
            dotsWrapperWidth += 130; 
        }
        var totalDots = slickDotsEl.find("li").length
        // var isFeedback = wrapper.hasClass("feedback")

        // if (isFeedback) {
        //     fbDotWidth = 125;
        // }

        var totalElWidth = slickDotWidth * (totalDots - ((this.hasFeedbackBlock) ? 1 : 0));
        if (currWidth >= 768) {
            if (totalElWidth >= dotsWrapperWidth) {
                if (!slickDotsEl.hasClass("dots-small")) {
                    slickDotsEl.addClass("dots-small");
                    $(".feedback-label-wrapper").addClass("small-btn");
                    this.progressScrollbar = slickDotsEl.overlayScrollbars({}).overlayScrollbars();
                }
            } else {
                if (slickDotsEl.hasClass("dots-small")) {
                    slickDotsEl.removeClass("dots-small");
                    $(".feedback-label-wrapper").removeClass("small-btn");
                }
            }
        } else {
            slickDotsEl.removeClass("dots-small");
            $(".feedback-label-wrapper").removeClass("small-btn");
        }
    },

    // commenting resize function for now as design changed
    updateSlickDotsWidthOnResize: function (response) {
        var that = this;
        that.updateSlickDotsWidth(response);
        that.addRemoveProgressbarScroll();
        $(window).resize(function () {
            setTimeout(function() {
                that.updateSlickDotsWidth();
            }, 500);
            that.addRemoveProgressbarScroll();
            that.addImageZoomClass();
            that.toggleImageZoomClass();
        });
    },

    toggleEl: function (el) {
        if (el.is(":visible")) {
            el.hide();
        } else {
            el.show();
            el.removeClass("hide");
            $(el).prop('disabled', false);
        }
    },

    enableNextBtn: function (submitBtn) {
        nextBtn = submitBtn.parent().find('.next');
        this.enableNextArrow();
        // this.toggleEl(nextBtn);
        nextBtn.show();
        nextBtn.removeClass("hide");
        $(nextBtn).prop('disabled', false);
    },

    registerNextBtnClick: function () {
        var that = this;
        // $('.action button.next').each(function (index) {
        //     console.log($(this));
            
        //     $(this).on('click', function () {
        //         that.slider.slick('slickNext');
        //     });
        // });
        $(".problems-wrapper").on('click', "button.next", function () {
            that.slider.slick('slickNext');
            that.scrollToTop();
        });
    },

    hideNextBtn: function (list) {
        $(".assessment-block .vert.slick-slide").each(function (ind) {
            $(this).find('.action button.next').each(function () {
                if (!list.children_list[ind].attempt) {
                    $(this).hide();
                }
            });
        })

    },

    navigateToLastAttemptQues: function () {
        var list = this.responseData.children_list;
        var goTo = this.responseData.total;
        list.some(function (el, index) {
            if (!el.attempt) {
                goTo = index;
                return true;
            }
        });
        setTimeout(function () {
            $('.xblock-student_view .slider .vert-mod').slick('slickGoTo', goTo);
            $("ul li.slick-active").addClass('ready-attempt');
        }, 0);
        this.disableNextArrow();
    },

    enableNextArrow: function () {
        $(".fa-angle-right.slick-arrow").removeClass('slick-disabled');
    },

    disableNextArrow: function () {
        $(".fa-angle-right.slick-arrow").addClass('slick-disabled');
    },

    enableFeedbackNav: function () {
        // var slickDot = $("ul.slick-dots li:nth-last-child(2)");
        // if (slickDot) {
        //     slickDot.addClass('ready-attempt');
        // }
        slickDot = $(".feedback-label-wrapper");
        slickDot.addClass('ready-attempt');
    },

    enableNextSlickActiveDot: function () {
        var dotEl = $("ul li.slick-active").next();
        if (dotEl) {
            dotEl.addClass('ready-attempt');
        }

    },

    showAnswer: function (response) {
        if (response.assessment_type == "knowledge_acquisition" || response.assessment_type == "training") {
            if (response['answer']) {
                if (typeof response['answer'] == "string" && response['answer'].indexOf("solution id") == -1) {
                    var answers = response['answer'].split(",");
                    var ansId = response['answer_prob_state_id'];
                    $.each(answers, function (index, answer) {
                        var labelId = "#" + ansId + "-" + answer + "-label";
                        var labelEl = $("#inputtype_" + ansId).find(labelId);
                        if (labelEl) {
                            labelEl.addClass('choicegroup_correct');
                        }
                    })
                }
            }
        }
        
    },

    displayShowedAns: function (response) {
        var problemsEl = $(".assessment-block .xblock-student_view");
        if (response.assessment_type == "knowledge_acquisition" || response.assessment_type == "training") {
            $.each(problemsEl, function (index) {
                var el = $(this);
                // probType = el.find("[id*='problem-title']").text().trim();
    
                if (response.children_list[index] && response.children_list[index].attempt) {
                    if (el.find(".xblock--drag-and-drop").length) {
                        setTimeout(function () {
                            var showAnsEl = el.find(".show-answer-button");
                            showAnsEl.click();
                        }, 100);
                    } else {
                        try {
                            new Problem(el).show();
                        } catch (err) {
                            console.error("Not able to show ans", err);
                        }
                    }
                }
    
            })
        }
        

        // var problemTypes = [];
        // $("[id*='problem-title']").each(function () {
        //     problemTypes.push($(this).text().trim());
        // });
        // console.log(problemTypes);
        // $.each(response.children_list, function (index) {
        //     console.log(index, problemTypes[index]);
        //     if(problemTypes[index] != "Drag and Drop") {
        //         console.log(problemTypes[index]);

        //         if(this.attempt) {
        //             new Problem(problemsEl[index]).show();
        //         }
        //     }

        // })

    },

    registerD2DNextBtn: function () {
        var that = this;

        $(".xblock-student_view-drag-and-drop-v2").on("click", ".actions-toolbar button.next", function () {
            that.slider.slick('slickNext');
        });
    },

    registerCoursewareList: function () {
        var that = this;
        $('body').on("courseware:open courseware:close", function () {
            console.log("caught event");
            
            that.updateSlickDotsWidth();
        });
    },

    addRemoveProgressbarScroll: function () {
        var wrapper = $(".assessment-block.slider");
        var slickDotsEl = wrapper.find(".slick-dots");
        if ($(window).outerWidth() >= 768) {
            // add scrollbar if not there
            this.progressScrollbar = slickDotsEl.overlayScrollbars({});
            
        } else {
            // remove scrollbar if there
            slickDotsEl.overlayScrollbars({}).overlayScrollbars().destroy();
        }
    },

    addTimer: function () {
        
        var timerEl = '<div class="ap-timer"><span class="ap-timer-minutes">0</span><span>:</span><span class="ap-timer-seconds">0</span></div>';

        $(".assessment-block .slick-slider").append(timerEl);
    },

    calculateTime: function (time) {
        // converting time to epoch 
        // Divide by 1000 to convert time from millisec to sec

        var endTime = Date.parse(new Date(time)) / 1000;
        var currTime = Date.parse(new Date() ) / 1000;
        var leftTime = endTime - currTime;

        if (leftTime <= 0) {
            var temp = {
                "minutes": 0,
                "seconds": 0
            };
            return temp;
        }

        var minutes = Math.floor(leftTime / 60);
        var seconds = leftTime % 60;

        var imgZoomClickRegistered = false;

        return {
            "minutes": minutes,
            "seconds": seconds
        };

    },

    updateCountDown: function (time) {
        remainTime = this.calculateTime(time);

        /* hiding the timer */
        /* var wrapper = $(".ap-timer");
        wrapper.find(".ap-timer-minutes").text(remainTime.minutes);
        wrapper.find(".ap-timer-seconds").text(remainTime.seconds); */

        return remainTime;
    },

    startTimer: function (time, time_elapsed) {
        var that = this;

        /* Hiding the timer */
        // this.addTimer();
        if (!time_elapsed) {
            var intervalId = setInterval(function () {
                var remainTime = that.updateCountDown(time);
                           
                if (remainTime.minutes == 0 && remainTime.seconds == 0 && !time_elapsed) {
                    
                    that.updateStatistics(true);
                    clearInterval(intervalId);
                    that.navigateToSlide(that.playerCount.totalCount);
                }
            }, 1000);
            this.intervalId = intervalId;
        } else {
            this.disableAllSubmitBtn();
        }
        
    },

    navigateToSlide: function (slideNum) {
        this.slider.slick('slickGoTo', slideNum);
    },

    checkIfAttemptedAllProb: function (response) {
        var allAttempted = true;
        response.children_list.forEach(function (child) {
            if (!child.attempt) {
                allAttempted = false;
            }
        });

        if (allAttempted) {
            clearInterval(this.intervalId);
        }
    },

    disableAllSubmitBtn: function () {
        var that = this;
        setTimeout(function () {
            that.slider.find(".problems-wrapper").each(function () {
                $(this).find(".submit-attempt-container button.submit").addClass('btn-disabled');
                $(this).find(".submit-attempt-container button.submit").attr("disabled", true);
            })
        }, 5000)
    },

    addClassToImageLabels: function () {
        this.slider.find(".problems-wrapper").each(function () {
            if ($(this).find(".imageinput").length) {
                // $(this).find("label").addClass("problem-group-label");
                $(this).addClass("image-mapped-problem");
            } else if ($(this).find(".choicegroup").length) {
                $(this).addClass("choicegroup-problem");
            }
        })
    },

    hideCourseNav: function () {
       if ($(".assessment-block.slider").hasClass("ecg_competition")) {
       if ($("#action-preview-select").val() == "staff")
        { 
            console.log("test")
            $("#courseware-index").addClass("hide");
            $(".btn-side-list-courseware").addClass("hide");
            var tablist=$(".tabs") ;
            console.log("try");
            tablist.each(function() { 
                lilist=$(this).children().addClass("hide"); 
                console.log(lilist);
                lilist.last().removeClass("hide");
            });
        }
        else
        {
            $(".courseware.wrapper-course-material").addClass("hide");
            $("#courseware-index").addClass("hide");
            $(".btn-side-list-courseware").addClass("hide");
        }
    }},
    
    // Start Hariom : ET-183_TOC_changes

    started : "fa-check-partially-circle",
    complete : "fa-check-circle",

    get_subsection_progress: function(current_unit) {
        var that = this;
        var status;
        var current_unit_siblings = current_unit.siblings();
        if (current_unit_siblings.length != 0){
            current_unit_siblings.each(function () {
                var this_icon = $(this).children("a").children("button.last-level-title").children("span.complete-checkmark");
                if (this_icon.hasClass(that.complete)) {
                    status = that.complete;
                    return true;
                } else {
                    status = that.started;
                    return false;
                }
            });
        } else {
            status = that.complete;
        }
        return status;
    },

    get_section_progress: function(current_subsection){
        var that = this;
        var status;
        var current_subsection_siblings = current_subsection.siblings();
        if (current_subsection_siblings.length != 0){
            current_subsection_siblings.each(function () {
                var this_icon = $(this).children("button.subsection-text.accordion-trigger").children("span.complete-checkmark");
                if (this_icon.hasClass(that.complete)) {
                    status = that.complete;
                    return true;
                } else {
                    status = that.started;
                    return false;
                }
            });
        } else {
            status = that.complete;
        }
        return status;
    },

    updateTOCProgressIcon: function (toc_progress) {
        var that = this;

        // console.log(toc_progress);

        var unit_progress, subsection_progress, section_progress;
        unit_progress = subsection_progress = section_progress = '';

        var active_unit, active_unit_atag, active_unit_id, active_unit_icon;
        var active_subsection, active_section, active_subsection_icon, active_section_icon;

        active_unit = $("li.vertical.current");
        active_unit_atag = active_unit.find("a.outline-item.focusable.clearfix");
        active_unit_id = active_unit_atag.attr("id");
        active_unit_icon = active_unit_atag.find("button.last-level-title.current span.complete-checkmark")

        active_subsection = $("li.subsection.current");
        active_subsection_icon = active_subsection.find("button.subsection-text.accordion-trigger span.complete-checkmark");

        active_section = $("li.section.current");
        active_section_icon = active_section.find("button.section-name.accordion-trigger span.complete-checkmark");

        if (active_unit_id == toc_progress['block_id']){
            // get progress for unit, subsection, section
            if (toc_progress["status"] == "Started"){
                unit_progress = that.started
                subsection_progress = that.started
                section_progress = that.started
            } else if (toc_progress["status"] == "Complete"){
                unit_progress = that.complete
                // If all the sibling units are complete -> update subsection = complete else started
                subsection_progress = that.get_subsection_progress(active_unit)
                // If all the sibling subsections are complete -> update section = complete else started
                section_progress = that.get_section_progress(active_subsection)
            }
            // update progress icon
            // console.log("unit: ", unit_progress)
            if (unit_progress != ''){
                active_unit_icon.addClass(unit_progress)
            }
            // console.log("subsect: ", subsection_progress)
            if (subsection_progress != ''){
                active_subsection_icon.addClass(subsection_progress)
            }
            // console.log("sect: ", section_progress)
            if (section_progress != ''){
                active_section_icon.addClass(section_progress)
            }
        };

    },
    scrollToTop: function () {
        $([document.documentElement, document.body]).animate({
            scrollTop: $(".xblock-student_view-assessmentxblock").offset().top
        }, 100);
    },

    addImageZoomClass: function (soruce) {
        var currWidth = window.innerWidth;
        if (currWidth >= 768) {
            $(".question-description").each(function () {
                var el = $(this);
                var imgs = el.find("img");
                var thumbnailClass = "img-zoom";
                imgs.each(function (i) {
                    $(this).removeClass(thumbnailClass);
                });
            })
        }
    },

    toggleImageZoomClass: function () {
        
        var currWidth = window.innerWidth;
        if (currWidth >= 768) {
            if(!this.imgZoomClickRegistered) {
                $(".problems-wrapper").on("click", ".question-description img", function () {
                    $(this).toggleClass("img-zoom");
                });
                this.imgZoomClickRegistered = true;
            }
        } else {
            $(".problems-wrapper").off("click", ".question-description img");
            this.imgZoomClickRegistered = false;
        }
        
    },

    exportToCSV: function (filename, rows) {
        var processRow = function (row) {
            var finalVal = '';
            for (var j = 0; j < row.length; j++) {
                var innerValue = row[j] === null ? '' : row[j].toString();
                if (row[j] instanceof Date) {
                    innerValue = row[j].toLocaleString();
                };
                var result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                if (j > 0)
                    finalVal += ',';
                finalVal += result;
            }
            return finalVal + '\n';
        };

        var csvFile = '';
        for (var i = 0; i < rows.length; i++) {
            csvFile += processRow(rows[i]);
        }

        var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                // Browsers that support HTML5 download attribute
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    },

    initializeDownloadReport: function (GetReportUrl) {
        that = this;
        $(".staff-download-report").click(function () {
            $.ajax({
                type: 'POST',
                url: GetReportUrl,
                data: '{}',
                success: function (response) {
                    that.exportToCSV("export_result.csv", response.results);
                }
            })
        })
    }
}
