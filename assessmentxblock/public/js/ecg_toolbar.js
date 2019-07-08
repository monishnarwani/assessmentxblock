$.getScript('https://cdnjs.cloudflare.com/ajax/libs/jquery.panzoom/3.2.3/jquery.panzoom.min.js', function () {

    $(window).ready(function () {


        /*
            keys on element, based on which toolbar will be enabled
        */
        var toolbar_problem = 'div.slick-active div.problem p.question-description';
        var toolbar_class = 'measure_img';
        var time_1_second_in_pixels = 50,
            current_1_volt_in_pixels = 5000;

        /*
            cursor types
        */
        var default_cursor = 'default',
            grabbing_cursor = 'grabbing',
            grabbing_ie_cursor = 'url("/static/ekgtraining/images/icons/grabbing.cur"), auto',
            pointer_panning_cursor = 'url("/static/ekgtraining/images/icons/pointer_panning.png"), auto',
            pointer_panning_ie_cursor = 'url("/static/ekgtraining/images/icons/pointer_panning.cur"), auto',
            pointer_ruler_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler.png") 0 5, auto',
            pointer_ruler_ie_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler.cur") 0 5, auto',
            pointer_ruler_delete_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler_delete.png") 0 6, auto',
            pointer_ruler_delete_ie_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler_delete.cur") 0 6, auto',
            pointer_ruler_pan_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler_pan.png"), auto',
            pointer_ruler_pan_ie_cursor = 'url("/static/ekgtraining/images/icons/pointer_ruler_pan_.cur"), auto',
            icon_pipette_ruler_cursor = 'url("/static/ekgtraining/images/icons/icon_pipette_ruler.png") 0 25, auto',
            icon_pipette_ruler_ie_cursor = 'url("/static/ekgtraining/images/icons/icon_pipette_ruler.cur") 0 25, auto';

        /*
            font style
        */
        var default_font_color = '#525252',
            default_font_size = 17,
            default_font_family = 'FiraSansBook';

        /*
            Panzoom variables
        */
        var minZoomScale = 0.5;
        var currentZoomScale = 1;

        /*
            global working variables
        */
        var active_prob = '',
            svg_container = '',
            toolbar_container = '',
            PreviousPos = [],
            CurrentPos = [],
            start_measure = false,
            delete_measure_onclick = false,
            mobile_view = false,
            slide_changed = false,
            page_loaded = false,
            is_qtc_enabled = true,
            qtc_ruler_el = null,
            active_ruler = '',
            draggable_handles = '',
            draggable_right_handle = '',
            draggable_group = '',
            draggable_obj = '';
        var default_transition_delay = 'all 0s',
            transition_delay_02 = 'all 0.2s',
            transition_delay_05 = 'all 0.5s';
        var xOffset = 0, yOffset = 0;

        /*
            global styling variables
        */
        /*
        note that 1 stroke-width = 4px
        needed dummy path width = 1px => 0.25 stroke-width
        needed path width = 3px => 0.75 stroke-width
        needed bevelled shape dim = 3px X 8px => 0.75 X 2 stroke-width
        var stroke_width = 0.75, dummy_stroke_width = 0.25, marker_width = 0.75, marker_height = 2;
        */

        // below value has been adjusted as per user friendly UI design
        var stroke_width = 3.5, 
            dummy_stroke_width = 0.7, 
            stroke_color = '#4A9DD8',
            dummy_stroke_color = '#8DCDEC',
            marker_height = stroke_width * 0.6, // marker/triangle height = 60% of stroke_width, can be adjusted based on need
            marker_width = marker_height * 0.6, // marker/triangle width = 60% of marker/triangle height, can be adjusted based on need
        // use below value to control the distance between horizontal line and vertical line intersection
        // this enables/disables overlaping of horizontal and vertical marker at common point
            corner_edge = marker_height * 1.6,
        // mobile handle UI
            left_handle_icon = '/static/ekgtraining/images/icons/icon-start.png',
            right_handle_icon = '/static/ekgtraining/images/icons/icon-end.png',
            handle_icon_width = 20,
            handle_icon_height = 20;

        var stroke_style = 'style="fill-opacity:0.0;stroke:'+ stroke_color +';stroke-width:'+ stroke_width +';"',
            dummy_stroke_style = 'style="fill-opacity:0.0;stroke:'+ dummy_stroke_color +';stroke-width:'+ dummy_stroke_width +';"',
            text_bg_style = 'style="fill:#FFFFFF;stroke-width:0.25;stroke:#E0E0E0;"',
            path_bg_style = 'style="fill-opacity:0.0;fill:#FFFFFF;stroke-width:0.0;stroke:#E0E0E0;"';

        /*
            working variables
        */
        var min_font_size = 8,
            max_font_size = 25,
            min_stroke_width = stroke_width * 0.5,
            max_stroke_width = stroke_width;
        var working_font_size = default_font_size,
            working_stroke_width = stroke_width;

        /*
            global DOM elements
        */
        // time and voltage measurement path
        var path_bg = '<rect class="voltage_time_path_bg" x="0" y="0" width="0" height="0" ' + path_bg_style + '></rect>',
            time_path = '<path class="time_path" d="" marker-start="url(#left_up_arrow)" marker-end="url(#right_up_arrow)" ' + stroke_style + ' />',
            voltage_path = '<path class="voltage_path" d="" marker-start="url(#up_right_arrow)" marker-end="url(#down_right_arrow)" ' + stroke_style + ' />',
            // dummy polyline drawn while moving mouse
            dummy_polyline = '<polyline class="dummy_polyline" points="" ' + dummy_stroke_style + ' />',
            // text label for voltage measurement
            voltage_text_container = '<rect class="voltage container" x="0" y="0" width="0" height="0" ' + path_bg_style + '></rect>',
            voltage_text_bg = '<rect class="voltage bg" x="0" y="0" width="0" height="0" ' + text_bg_style + '></rect>',
            voltage_text = '<text class="voltage" x="" y="" fill="' + default_font_color + '" font-size="' + default_font_size + '" font-family="' + default_font_family + '" ></text>',
            // text label for time measurement
            time_text_container = '<rect class="time container" x="0" y="0" width="0" height="0" ' + path_bg_style + '></rect>',
            time_text_bg = '<rect class="time bg" x="0" y="0" width="0" height="0" ' + text_bg_style + '></rect>',
            time_text = '<text class="time" x="" y="" fill="' + default_font_color + '" font-size="' + default_font_size + '" font-family="' + default_font_family + '" ></text>',
            // handle icons for mobile view
            right_handle_image = '<image x="0" y="0" href="'+ right_handle_icon +'" width="'+ handle_icon_width +'" height="'+ handle_icon_height +'" id="right_handle" style="position: absolute; top: 0px; left: 0px;" alt="Right selection indicator" class="right_handle hide" />',
            left_handle_image = '<image x="0" y="0" href="'+ left_handle_icon +'" width="'+ handle_icon_width +'" height="'+ handle_icon_height +'" id="left_handle" style="position: absolute; top: 0px; left: 0px;" alt="Left selection indicator" class="left_handle hide" />';

        // beveled shaped markers
        var left_up_arrow = '<marker id="left_up_arrow" markerWidth="'+ marker_width +'" markerHeight="'+ marker_height +'" refX="0" refY="'+ marker_height +'" orient="0" markerUnits="strokeWidth"><path d="M0,0 L0,'+marker_height+' L'+marker_width+','+marker_height+' z" fill="#4A9DD8" /></marker>',
            right_up_arrow = '<marker id="right_up_arrow" markerWidth="'+ marker_width +'" markerHeight="'+ marker_height +'" refX="0" refY="0" orient="180" markerUnits="strokeWidth"><path d="M0,0 L'+marker_width+',0 L0,'+marker_height+' z" fill="#4A9DD8" /></marker>',
            left_down_arrow = '<marker id="left_down_arrow" markerWidth="'+ marker_width +'" markerHeight="'+ marker_height +'" refX="0" refY="0" orient="0" markerUnits="strokeWidth"><path d="M0,0 L'+marker_width+',0 L0,'+marker_height+' z" fill="#4A9DD8" /></marker>',
            right_down_arrow = '<marker id="right_down_arrow" markerWidth="'+ marker_width +'" markerHeight="'+ marker_height +'" refX="0" refY="'+ marker_height +'" orient="180" markerUnits="strokeWidth"><path d="M0,0 L0,'+marker_height+' L'+marker_width+','+marker_height+' z" fill="#4A9DD8" /></marker>',
            up_left_arrow = '<marker id="up_left_arrow" markerWidth="'+ marker_height +'" markerHeight="'+ marker_width +'" refX="0" refY="0" orient="180" markerUnits="strokeWidth"><path d="M0,0 L0,'+marker_width+' L'+marker_height+',0 z" fill="#4A9DD8" /></marker>',
            down_left_arrow = '<marker id="down_left_arrow" markerWidth="'+ marker_height +'" markerHeight="'+ marker_width +'" refX="'+ marker_height +'" refY="0" orient="0" markerUnits="strokeWidth"><path d="M0,0 L'+marker_height+',0 L'+marker_height+','+marker_width+' z" fill="#4A9DD8" /></marker>',
            up_right_arrow = '<marker id="up_right_arrow" markerWidth="'+ marker_height +'" markerHeight="'+ marker_width +'" refX="'+ marker_height +'" refY="0" orient="180" markerUnits="strokeWidth"><path d="M0,0 L'+marker_height+',0 L'+marker_height+','+marker_width+' z" fill="#4A9DD8" /></marker>',
            down_right_arrow = '<marker id="down_right_arrow" markerWidth="'+ marker_height +'" markerHeight="'+ marker_width +'" refX="0" refY="0" orient="0" markerUnits="strokeWidth"><path d="M0,0 L0,'+marker_width+' L'+marker_height+',0 z" fill="#4A9DD8" /></marker>';

        var marker_def = '<defs>'
            + left_up_arrow + right_up_arrow
            + left_down_arrow + right_down_arrow
            + up_left_arrow + down_left_arrow
            + up_right_arrow + down_right_arrow
            + '</defs>';

        var text_label = '<g class="text_label">' + voltage_text_container + voltage_text_bg + voltage_text + '</g>'
            + '<g class="text_label">' + time_text_container + time_text_bg + time_text + '</g>';

        // add draggable elements in draggable group
        var draggable_el = left_handle_image + right_handle_image 
            + path_bg + voltage_path + time_path 
            + text_label 
            + dummy_polyline;
        var draggable_grp =  '<g class="draggable">' + draggable_el + '</g>';

        // add panzoom svg elements in panzoom svg
        var panzoom_svg_el = marker_def + draggable_grp;
        var panzoom_svg_style = 'style="background-image: url(panzoom_svg_background); background-repeat: no-repeat; background-size: contain; position: relative; left: 0; top: 0; width: 100%; height: auto;"';
        var panzoom_svg = '<svg id="container" width="1232" height="728" ' + panzoom_svg_style + ' >' + panzoom_svg_el + '</svg>';

        // add main container elements 
        var svg_container_div_el = panzoom_svg;
        var svg_container_div = '<div class="svg-container" style="width:100%; height:auto;">' + svg_container_div_el + '</div>';

        var close_fullscreen = '<div class="close_fullscreen hide"><span class="icon_close"></span></div>';

        var calculator_toolbar = '<div class="calculator_toolbar"><acronym title="QTc-Rechner"><span id="qtc-btn" class="icon_rechner-1"></span><p>QTC</p></acronym></div>';
        var ruler_toolbar = '<div class="ruler_toolbar"><acronym title="EKG Lineal"><span id="ruler" class="icon_ruler-1"></span></acronym><acronym title="Heranzoomen"><span id="zoomin" class="icon_zoom_in"></span></acronym><acronym title="Herauszoomen"><span id="zoomout" class="icon_zoom_out"></span></acronym><acronym title="Zurücksetzen"><span id="zoomreset" class="icon_back"></span></acronym><acronym title="Vollbild"><span id="fullscreen" class="icon_fullscreen toggle-fullscreen"></span></acronym></div>';

        // add toolbar elements in toolbar container
        var main_toolbar_container_el = '';
        if (is_qtc_enabled) {
            main_toolbar_container_el += calculator_toolbar;
        }
        main_toolbar_container_el += ruler_toolbar;
        var main_toolbar_container = '<div class="ecg_toolbar">' + main_toolbar_container_el + '</div>';

        // add fullscreen wrapper
        var fullscreen_container_el = svg_container_div + close_fullscreen + main_toolbar_container;
        var fullscreen_container_div = '<div class="fullscreen-wrapper">' + fullscreen_container_el + '</div>';

        // If enabled, append QTc HTML to container
        var qtc_html = '';
        if (is_qtc_enabled) {
            qtc_html += '<div class="qtc-calc-container hide"><div class="qtc-col qtc-col-1"><div class="form-group"> <label for="hrate">RR Abstand<span class="qtc-calc-ruler"></span></label> <input id="hrate" type="text" class="form-control" placeholder="0 ms"> <div class="qtc-hfreq span-input"><span>Herzfrequenz:&nbsp;</span><span class="qtc-hfreq-result span-el"><span class="span-el-inner" data-append=" bpm">0 bpm </span> <span class="edit-icon"></span> </span> <input type="text" class="hide"> </div> </div>  <div class="form-group"> <label for="qtTime">QT-Zeit <span class="qtc-calc-ruler"></span> </label> <input id="qtTime" type="text" class="form-control"  placeholder="0 ms"> </div> <div class="qtc-result"><span>QTc: </span><span class="qtc-result-val">0 ms</span>  </div><div class="qtc-footer"><span>Norm: 350-400 ms</span>  </div></div><div class="qtc-col qtc-col-2"><div class="qtc-formula-container"><div class="qtc-formula hide">  <span><img src="/static/ekgtraining/images/qtc_formula_bpm.png" alt=""></span><img src="/static/ekgtraining/images/qtc_formula.png" alt=""></div><button class="qtc-formula-btn btn">Formel einblenden</button> </div> </div></div>';
        }

        // add unique problem description id to main parent container
        var main_parent_container_el = fullscreen_container_div + qtc_html;
        var main_parent_container = '<div id="svg_desc_id" class="svg_ecgtoolbar_container">' + main_parent_container_el + '</div>';

        /*
            handle first problem load (first slide load, no slide change occured) on document load.
            - creates toolbar if necessary
        */
        setTimeout(function () {
            if (!slide_changed) {
                page_loaded = true;
                console.log("delayed call on load");
                init_ecgtoolbar();
            }
        }, 800);

        /*
            handle slide change event 
            - creates toolbar if necessary
        */
        $("#main").on("AssessmentXBlock:slideChanged", function () {
            slide_changed = true;
            if (!page_loaded) {
                console.log("calling on slide change");
                init_ecgtoolbar();
                page_loaded = false;
            }
        });

        /*
            main function to initialize ecg toolbar wherever needed
            - gets current active slick, generates ecg toolbar dom elements, set current svg as active svg, enable panzoom, drag, mousewheel and pinch.
        */
        function init_ecgtoolbar() {
            init_global_vars();
            active_prob = $(toolbar_problem);
            var active_prob_id = active_prob.attr("id");
            create_svg_ecgtoolbar_container(active_prob);

            $(".svg_ecgtoolbar_container").each(function () {
                svg_container = '', toolbar_container = '';
                // add toolbar only to current active problem on slick
                if ($(this).attr("id") == "svg_" + active_prob_id) {
                    $(this).addClass("active");
                    svg_container = $(this).find(".svg-container svg");
                    toolbar_container = $(this).find(".ecg_toolbar");
                    enable_panzoom(svg_container);
                    enable_mousewheel(svg_container);
                    enable_pinch(svg_container);
                    enable_svg_el_drag(svg_container);
                    enable_fullscreen($(this), svg_container, toolbar_container);
                    handle_rulertrigger(svg_container, toolbar_container);
                    handle_qtc(toolbar_container);
                } else {
                    $(this).siblings("img").each(function () {
                        // add measure_img tag and remove hide to indicate that image ruler container has been deleted and ready for re-generation on next visit
                        $(this).toggleClass("hide "+toolbar_class);
                    });
                    // remove toolbar for other problems
                    $(this).remove();
                }
            });
        }


        /*
            initilalize global working variables
        */
        function init_global_vars() {
            active_prob = '',
                svg_container = '',
                toolbar_container = '',
                PreviousPos = [],
                CurrentPos = [],
                start_measure = false,
                delete_measure_onclick = false,
                mobile_view = false,
                page_loaded = false,
                is_qtc_enabled = true,
                qtc_ruler_el = null,
                draggable_handles = '',
                draggable_right_handle = '',
                draggable_group = '',
                draggable_obj = '';

            if ($(window).width() <= 1024) {
                mobile_view = true;
            }
        }

        /*
            Creates svg container, QTc calculator and toolbar container for images with ruler facility
        */
        function create_svg_ecgtoolbar_container(that) {
            var desc_id = that.attr("id");
            var img = that.find("img."+toolbar_class);
            if (img.length != 0) {
                var img_src = img.attr("src");
                time_1_second_in_pixels = img.attr('data-time_1_second_in_pixels');
                current_1_volt_in_pixels = img.attr('data-current_1_volt_in_pixels');
                // remove measure_img tag and add hide to indicate that image ruler container has been generated
                img.toggleClass("hide "+toolbar_class);

                // set image url for svg background
                var main_parent_container_temp = main_parent_container.replace('svg_desc_id', 'svg_'+desc_id);
                main_parent_container_temp = main_parent_container_temp.replace('panzoom_svg_background', "'" + img_src + "'" );

                var updated_html = that.html() + main_parent_container_temp;

                that.html(updated_html);
            }
        }

        /*
            Enable pan and zoom feature for created svg and toolbar container
        */
        function enable_panzoom(container) {
            container.panzoom({
                minScale: minZoomScale,
                $zoomIn: $(".icon_zoom_in"),
                $zoomOut: $(".icon_zoom_out"),
                $reset: $(".icon_back"),
                cursor: default_cursor,
            });
        }

        /*
            Enable mousewheel zoom for created svg and toolbar container
        */
        function enable_mousewheel(container) {
            $.getScript('https://cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js', function () {
                container.on('mousewheel', function (event, delta) {
                    event.preventDefault();
                    var zoomout = delta < 0;
                    $(this).panzoom("zoom", zoomout,{
                        focal: event
                    });
                });
            });
        }

        /*
            Enable pinch zoom for created svg and toolbar container
        */
        function enable_pinch(container) {
            $.getScript('https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js', function () {
                var hammertime = new Hammer(container[0]);
                // enable pinch - by default disabled by browser
                hammertime.get('pinch').set({ enable: true });
                // handle pinchin/pinchout
                hammertime.on('pinchin', function (ev) {
                    container.panzoom("zoom", true);
                });
                hammertime.on('pinchout', function (ev) {
                    container.panzoom("zoom", false);
                });
            });
        }

        /*
            Handle full screen mode for created svg and toolbar container
        */
        function enable_fullscreen(that, svg_container, toolbar_container) {
            toolbar_container.find(".toggle-fullscreen").on("click", function () {
                handle_fullscreen(that, svg_container, toolbar_container);
            });
            that.find(".close_fullscreen").on("click", function() {
                handle_fullscreen(that, svg_container, toolbar_container);
            });
            handle_fullscreen_exit(that, toolbar_container);
        }

        function handle_fullscreen(that, svg_container, toolbar_container) {
            /*
                In fullscreen mode, complete toolbar is removed from default place 
                and appended to body of page to accomplish desired UI.
                In normal mode, toolbar is at its default place i.e. within problem description div.
            */
            var previousWidthSVG = svg_container.width(),
                previousHeightSVG = svg_container.height();
            
            that.find(".close_fullscreen").toggleClass("hide");
            that.toggleClass('fullscreen-mode');
            var pdesc = that.parents("p.question-description");
            var fullscreen_icon = toolbar_container.find(".icon_fullscreen");
            if (pdesc.length != 0) {
                fullscreen_icon.addClass('active');
                $(document.body).append(that);
            } else {
                fullscreen_icon.removeClass('active');
                active_prob.append(that);
            }

            var currentWidthSVG = svg_container.width(),
                currentHeightSVG = svg_container.height();
            var widthRatioSVG = currentWidthSVG/previousWidthSVG,
                heightRatioSVG = currentHeightSVG/previousHeightSVG;

            // rescale measurement elements while switching between full-screen and normal mode
            time_1_second_in_pixels /= widthRatioSVG;
            current_1_volt_in_pixels /= heightRatioSVG;
            if (PreviousPos.length!=0 && CurrentPos.length != 0) {
                PreviousPos[0] *= widthRatioSVG;
                PreviousPos[1] *= heightRatioSVG;
                CurrentPos[0] *= widthRatioSVG;
                CurrentPos[1] *= heightRatioSVG;
                draw_lines(svg_container, PreviousPos, CurrentPos);
            }
        }

        // bind escape key to delete measurement or exit fullscreen mode
        function handle_fullscreen_exit(that, toolbar_container) {
            $(document).off('keyup');
            $(document).on('keyup', function (event) {
                var ESC = 27;
                if (event.keyCode == ESC) {
                    // first esc should delete measurement/exit ruler tool if any/selected
                    // second esc should exit full screen mode
                    if (start_measure) {
                        toolbar_container.find(".icon_ruler-1").click();
                    } else {
                        var svg_block = $('.fullscreen-mode');
                        if (svg_block.hasClass("fullscreen-mode")) {
                            that.find(".close_fullscreen").click();
                        }
                    }
                }
            });
        }

        /*
            handle dragging of draggable svg elements
        */
        function enable_svg_el_drag(container) {
            
            draggable_group = container.find("g.draggable");
            makeDraggable(container, draggable_group);

            draggable_handles = container.find("image.left_handle, image.right_handle");
            draggable_right_handle = container.find("image.right_handle");
            if (mobile_view) {
                draggable_handles.each(function() {
                    var start_clientX, start_clientY, startPos, NewPos;
                    $(this)[0].addEventListener('touchstart', function (e) {
                        container.panzoom("disable");
                        container.parents(".svg-container").css({ "overflow": "hidden", "position": "relative" });
                        start_clientX = e.touches[0].clientX/currentZoomScale;
                        start_clientY = e.touches[0].clientY/currentZoomScale;
                        if ($(this).hasClass('left_handle')) {
                            startPos = PreviousPos;
                        } else if ($(this).hasClass('right_handle')) {
                            startPos = CurrentPos;
                        }
                    });
                    $(this)[0].addEventListener('touchmove', function (e) {
                        var currentTouch = e.touches[0];
                        var currentTouchX = currentTouch.clientX/currentZoomScale,
                            currentTouchY = currentTouch.clientY/currentZoomScale;
                        if ($(this).hasClass('left_handle')) {
                            PreviousPos = [startPos[0]+(currentTouchX-start_clientX), startPos[1]+(currentTouchY-start_clientY)];
                        } else if ($(this).hasClass('right_handle')) {
                            CurrentPos = [startPos[0]+(currentTouchX-start_clientX), startPos[1]+(currentTouchY-start_clientY)];
                        }
                        draw_lines(container, PreviousPos, CurrentPos);
                    });
                    $(this)[0].addEventListener('touchend', function (e) {
                        container.panzoom("enable");
                    });
                });
            }
        }

        function makeDraggable(svg_container, draggable_el) {
            var dragItem = draggable_el.find('rect.voltage_time_path_bg')[0];

            var active = false;
            var currentX;
            var currentY;
            var initialX;
            var initialY;

            $(dragItem).mouseenter(function (e) {
                svg_container.panzoom('disable');
                svg_container.parents(".svg-container").css({ "overflow": "hidden", "position": "relative" });
            });
            $(dragItem).mouseleave(function (e) {
                svg_container.panzoom('enable');
                update_cursor_icon(svg_container);
            });

            dragItem.addEventListener("touchstart", dragStart, false);
            dragItem.addEventListener("touchend", dragEnd, false);
            dragItem.addEventListener("touchmove", drag, false);

            dragItem.addEventListener("mousedown", dragStart, false);
            dragItem.addEventListener("mouseup", dragEnd, false);
            dragItem.addEventListener("mousemove", drag, false);

            function dragStart(e) {
                if (e.type === "touchstart") {
                    svg_container.panzoom("disable");
                    svg_container.parents(".svg-container").css({ "overflow": "hidden", "position": "relative" });
                    initialX = e.touches[0].clientX/currentZoomScale - xOffset;
                    initialY = e.touches[0].clientY/currentZoomScale - yOffset;
                } else {
                    initialX = e.clientX/currentZoomScale - xOffset;
                    initialY = e.clientY/currentZoomScale - yOffset;
                }

                active = true;

                $(dragItem).css({
                    cursor: grabbing_cursor,
                    cursor: grabbing_ie_cursor,
                });
            }

            function dragEnd(e) {
                if (e.type === "touchend") {
                    svg_container.panzoom("enable");
                    // update Previous and Current Position for mobile view as handles are also moved
                    PreviousPos[0] += currentX;
                    PreviousPos[1] += currentY;
                    CurrentPos[0] += currentX;
                    CurrentPos[1] += currentY;
                }
                initialX = currentX;
                initialY = currentY;

                active = false;

                $(dragItem).css({
                    cursor: pointer_ruler_pan_cursor,
                    cursor: pointer_ruler_pan_ie_cursor,
                });
            }

            function drag(e) {
                if (active) {

                    e.preventDefault();

                    if (e.type === "touchmove") {
                        currentX = e.touches[0].clientX/currentZoomScale - initialX;
                        currentY = e.touches[0].clientY/currentZoomScale - initialY;
                    } else {
                        currentX = e.clientX/currentZoomScale - initialX;
                        currentY = e.clientY/currentZoomScale - initialY;
                    }

                    xOffset = currentX;
                    yOffset = currentY;

                    setTranslate(currentX, currentY, dragItem);

                    $(dragItem).css({
                        cursor: grabbing_cursor,
                        cursor: grabbing_ie_cursor,
                    });
                }
            }

            function setTranslate(xPos, yPos, el) {
                var el = $(el).parents('g.draggable')[0];
                el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
            }
        }

        /*
            Allow measurement only if ruler is triggered and delete measurement if ruler is exited
        */
        function handle_rulertrigger(svg_container, toolbar_container) {

            // enable/disable measurement on ruler icon click
            toolbar_container.find(".icon_ruler-1").add(".qtc-calc-ruler").on("click", function (e) {
                // if ruler was already active and clicked ruler is different then
                // disable old ruler and enable current ruler
                if (active_ruler[0] != $(this)[0] && active_ruler != '') {
                    disable_measurement(svg_container, active_ruler);
                    enable_measurement(svg_container, $(this));
                } else {
                    // if no active ruler then
                    // disable measurement, delete drawn measurement if already enabled else enable measurement
                    if (start_measure) {
                        disable_measurement(svg_container, $(this));
                    } else {
                        enable_measurement(svg_container, $(this));
                    }
                }
            });

            // handle click, mousemove once measurement is enabled
            handle_drawing(svg_container);
        }

        function disable_measurement(container, that) {
            qtc_ruler_el = null;
            start_measure = false;
            delete_measure_onclick = false;
            delete_old_lines(container);
            container.css({
                cursor: default_cursor,
            });
            PreviousPos = [];
            CurrentPos = [];
            that.removeClass('active');
            active_ruler = '';
        }

        function enable_measurement(container, that) {
            start_measure = true;
            // updated cursors
            container.css({
                cursor: pointer_ruler_cursor,
                cursor: pointer_ruler_ie_cursor,
            });
            container.find("g").css({
                cursor: pointer_ruler_cursor,
                cursor: pointer_ruler_ie_cursor,
            });
            that.addClass('active');
            active_ruler = that;
            // updated mouse icon if qtc ruler selected
            if (that.hasClass("qtc-calc-ruler")) {
                qtc_ruler_el = that;
                container.css({
                    cursor: icon_pipette_ruler_cursor,
                    cursor: icon_pipette_ruler_ie_cursor,
                });
            }
            // draw default measurement for mobile view once ruler is triggered
            if (mobile_view) {
                PreviousPos = [100, 100];
                CurrentPos = [150, 50];
                draw_lines(container, PreviousPos, CurrentPos);
            }
        }

        function handle_drawing(container) {

            // listen for mousemove after selecting first point so as to draw dynamic line on mouse move
            container.mousemove(function (event) {
                // if start(previous) position is selected and end position is not selected then draw line with mouse move
                if (!delete_measure_onclick && PreviousPos.length != 0) {
                    CurrentPos = get_current_position($(this), event);
                    if (qtc_ruler_el) {
                        draw_lines(container, PreviousPos, CurrentPos, false, true, false);
                    } else {
                        draw_lines(container, PreviousPos, CurrentPos, true);
                    }
                }
            });

            // container.on('panzoomstart', function (e, panzoom, event, touches) {
            //     console.log("panzoomstart");
            // });

            container.on('panzoomchange', function (e, panzoom, transform) {
                // console.log("panzoomchange", transform[0]);
                var scale = transform[0];
                currentZoomScale = scale;
                rescale_draggable_group(scale);
            });

            // container.on('panzoomzoom', function (e, panzoom, scale, opts) {
            //     console.log("panzoomzoom", scale);
            // });

            // set panning cursor while panning the ECG image
            container.on('panzoompan', function (e, panzoom, x, y) {
                // console.log("panzoompan");
                container.css({
                    cursor: pointer_panning_cursor,
                    cursor: pointer_panning_ie_cursor,
                });
            });

            // listen for clicks in svg container and draw lines based on points selected
            container.on('panzoomend', function (e, panzoom, matrix, changed) {
                // console.log("panzoomend");
                if (changed) {
                    // deal with drags or touch moves
                } else {
                    // deal with clicks or taps only if ruler is triggered i.e. if measurement is enabled
                    if (start_measure && !mobile_view) {
                        // if 3rd click then delete old measurement
                        if (delete_measure_onclick) {
                            delete_old_lines($(this));
                            // change cursor after deleting measurement
                            container.css({
                                cursor: pointer_ruler_cursor,
                                cursor: pointer_ruler_ie_cursor,
                            });
                            delete_measure_onclick = false;
                            PreviousPos = [];
                        } else {
                            // set Current Position as the current mouse click coordinates
                            CurrentPos = get_current_position($(this), event);
                            // if Previous Position was already set then draw measurement line using Previous and Current coordinates
                            draw_lines(container, PreviousPos, CurrentPos);
                            if (PreviousPos.length != 0) {
                                // delete measurement on next click i.e. on third click
                                delete_measure_onclick = true;
                                if (qtc_ruler_el) {
                                    $(qtc_ruler_el).parent().siblings("input").val(container.find("text.time").text().split(" ")[0]).change();
                                    qtc_ruler_el.click();
                                }
                            } else {
                                PreviousPos = CurrentPos;
                            }
                        }
                    }
                }
                update_cursor_icon(container);
            });

            // container.on('panzoomreset', function (e, panzoom, matrix) {
            //     // console.log("panzoomreset");
            // });
        }

        /*
            Function to update cursor icons based on operation
        */
        function update_cursor_icon(container) {
            if (start_measure) {
                container.css({
                    cursor: pointer_ruler_cursor,
                    cursor: pointer_ruler_ie_cursor,
                });
                draggable_group.find('rect.voltage_time_path_bg').css({
                    cursor: pointer_ruler_cursor,
                    cursor: pointer_ruler_ie_cursor,
                });
                draggable_group.find('polyline').css({
                    cursor: pointer_ruler_cursor,
                    cursor: pointer_ruler_ie_cursor,
                });
                if (delete_measure_onclick) {
                    container.css({
                        cursor: pointer_ruler_delete_cursor,
                        cursor: pointer_ruler_delete_ie_cursor,
                    });
                    draggable_group.find('rect.voltage_time_path_bg').css({
                        cursor: pointer_ruler_pan_cursor,
                        cursor: pointer_ruler_pan_ie_cursor, 
                    });
                }
                if (qtc_ruler_el) {
                    container.css({
                        cursor: icon_pipette_ruler_cursor,
                        cursor: icon_pipette_ruler_ie_cursor,
                    });
                    draggable_group.find('rect.voltage_time_path_bg').css({
                        cursor: icon_pipette_ruler_cursor,
                        cursor: icon_pipette_ruler_ie_cursor,
                    });
                    draggable_group.find('polyline').css({
                        cursor: icon_pipette_ruler_cursor,
                        cursor: icon_pipette_ruler_ie_cursor,
                    });
                }
            } else {
                container.css({
                    cursor: default_cursor,
                });
                draggable_group.find('polyline').css({
                    cursor: pointer_ruler_cursor,
                    cursor: pointer_ruler_ie_cursor,
                });
            }
        }

        /*
            Utility function to get click/mouse position based on different browsers
        */
        function get_current_position(container, event) {
            var offset = container.offset(),
                posX = event.offsetX ?
                    event.offsetX : event.pageX - offset.left,
                posY = event.offsetY ?
                    event.offsetY : event.pageY - offset.top;
            if($.browser.chrome) {
                // alert(1);
                // called for chrome and MS Edge
            } else if ($.browser.mozilla) {
                // alert(2);
                // called for Mozilla and IE
                // detect if IE, msie > 0 for IE browsers
                var msie = window.navigator.userAgent.indexOf("MSIE ");
                // keep old values as it is if IE
                if (msie <= 0) {
                    var orig_event = event.originalEvent;
                    if (orig_event) {
                        event = orig_event;
                    }
                    posX = event.layerX ? event.layerX : event.offsetX;
                    posY = event.layerY ? event.layerY : event.offsetY;
                }
            } else if ($.browser.msie) {
                // alert(3);
                // should be called for IE but not being called
            }
            posX = roundTo(posX, 2);
            posY = roundTo(posY, 2);
            return [posX, posY];
        }

        /*
            Function to delete/resetting drawn lines 
            - called on exiting ruler or first esc in fullscreen mode
        */
        function delete_old_lines(container) {
            container.find("image").addClass("hide").attr({
                x: 0,
                y: 0,
                transform: "matrix(1,0,0,1,0,0)",
            });

            var draggable_group_els = container.find("g.draggable");
            draggable_group[0].style.transform = "translate3d(0px, 0px, 0)";
            xOffset = 0;
            yOffset = 0;
            
            draggable_group_els.find("rect.voltage_time_path_bg").attr({
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            });
            draggable_group_els.find("path").attr({
                "d": "",
            }).css({
                'transition': default_transition_delay,
            });
            draggable_group_els.children("g.text_label").each(function() {
                $(this).find("rect").attr({
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                });
                $(this).find("text").attr({
                    x: 0,
                    y: 0,
                }).css({
                    'transition': default_transition_delay,
                }).text("");
            });
            draggable_group_els.find("polyline").attr({
                points: "",
            });
        }

        /*
            Function to rescale draggable group elements based on zoom level
        */
        function rescale_draggable_group(scale) {
            draggable_group.find("path").css({
                'stroke-width': function(index, currentValue) {
                    working_stroke_width = stroke_width/scale;
                    if (working_stroke_width <= min_stroke_width) {
                        working_stroke_width = min_stroke_width;
                    } else if (working_stroke_width >= max_stroke_width) {
                        working_stroke_width = max_stroke_width;
                    }
                    return working_stroke_width;
                },
                'transition': transition_delay_05,
            });
            draggable_group.children('g.text_label').each(function() {
                var chlid_text_el = $(this).children('text');
                chlid_text_el.attr({
                    'font-size': function(index, currentValue) {
                        working_font_size = default_font_size/scale;
                        if (working_font_size <= min_font_size) {
                            working_font_size = min_font_size;
                        } else if (working_font_size >= max_font_size) {
                            working_font_size = max_font_size;
                        }
                        return working_font_size;
                    },
                }).css({
                    'transition': transition_delay_05,
                });
                setTimeout(function() {
                    set_text_bg(chlid_text_el, transition_delay_02);
                }, 300);
            });
        }

        /*
            Function to draw lines after selecting first point (PreviousPos)
            - draw_dummy_lines = true if dummy lines needed while moving mouse
            - allow_horizontal = true if only horizontal line to be drawn
            - allow_vertical = true if only vertical line to be drawn
        */
        function draw_lines(container, PreviousPos, CurrentPos, draw_dummy_lines, allow_horizontal, allow_vertical) {

            // default paramtere values
            draw_dummy_lines = typeof draw_dummy_lines !== 'undefined' ? draw_dummy_lines : false;
            allow_horizontal = typeof allow_horizontal !== 'undefined' ? allow_horizontal : true;
            allow_vertical = typeof allow_vertical !== 'undefined' ? allow_vertical : true;

            // delete old line first
            delete_old_lines(container);

            var time_path = container.find("path.time_path"),
                voltage_path = container.find("path.voltage_path"),
                pathBgEl = container.find("rect.voltage_time_path_bg");

            // if Previous Position is already selected then draw line and draw text label
            if (PreviousPos.length != 0) {
                // draw line using previous pos and current pos
                var start_x = PreviousPos[0], start_y = PreviousPos[1], end_x = CurrentPos[0], end_y = CurrentPos[1];
                var x_diff = CurrentPos[0] - PreviousPos[0], y_diff = CurrentPos[1] - PreviousPos[1], buffer = corner_edge;

                // For debugging purpose
                // console.log(start_x, start_y, end_x, end_y, x_diff, y_diff);

                var horizontal_line = false, vertical_line = false;

                // buffer value decides whether horizontal or vertical line to be drawn
                if ((y_diff <= buffer && y_diff >= -buffer) && allow_horizontal) {
                    // console.log("horizontal");
                    horizontal_line = true;

                    // y coordinate is fixed for horizontal line
                    setHorizontalPathData(time_path, start_x, end_x, start_y, end_y, corner_edge);
                    setRectAttrFromPath(pathBgEl, time_path, '');

                    // set measured time value in text label
                    updateTextLabelEl(container, start_x, start_y, end_x, end_y, time_1_second_in_pixels, 0, corner_edge);
                }
                if ((x_diff <= buffer && x_diff >= -buffer) && allow_vertical) {
                    // console.log("vertical");
                    vertical_line = true;

                    // x coordinate is fixed for line
                    setVerticalPathData(voltage_path, start_x, end_x, start_y, end_y, corner_edge);
                    setRectAttrFromPath(pathBgEl, '', voltage_path);

                    // container.find("polyline.polyline").attr("points", fill_points);
                    updateTextLabelEl(container, start_x, start_y, end_x, end_y, 0, current_1_volt_in_pixels, corner_edge);

                }

                // draw both horizontal and vertical lines if not within buffer
                if ((!horizontal_line && !vertical_line) && allow_horizontal && allow_vertical) {
                    // console.log("diagonal");

                    setHorizontalPathData(time_path, start_x, end_x, start_y, end_y, corner_edge);
                    setVerticalPathData(voltage_path, start_x, end_x, start_y, end_y, corner_edge);
                    setRectAttrFromPath(pathBgEl, time_path, voltage_path);

                    // container.find("polyline.polyline").attr("points", fill_points);
                    updateTextLabelEl(container, start_x, start_y, end_x, end_y, time_1_second_in_pixels, current_1_volt_in_pixels, corner_edge);

                    if (draw_dummy_lines || mobile_view) {
                        var x_adjustment = roundTo(dummy_stroke_width/2,1), y_adjustment = roundTo(dummy_stroke_width/2,1);
                        var start_pos = '',
                            mid_pos = '',
                            end_pos = '';
                        // adjusting polyline coordinate so as to avoid click on polyline itself rather than click on ECG Image
                        // note that start_pos is everytime from y axis end
                        if (end_x>start_x && end_y<start_y) {
                            // first quadrant
                            start_pos = (start_x - x_adjustment) + ',' + (end_y + y_adjustment);
                            mid_pos = (end_x - x_adjustment) + ',' + (end_y + y_adjustment);
                            end_pos = (end_x - x_adjustment) + ',' + (start_y + y_adjustment);
                        }
                        if (end_x<start_x && end_y<start_y) {
                            // second quadrant
                            start_pos = (start_x + x_adjustment) + ',' + (end_y + y_adjustment);
                            mid_pos = (end_x + x_adjustment) + ',' + (end_y + y_adjustment);
                            end_pos = (end_x + x_adjustment) + ',' + (start_y + y_adjustment);
                        }
                        if (end_x<start_x && end_y>start_y) {
                            // third quadrant
                            start_pos = (start_x + x_adjustment) + ',' + (end_y - y_adjustment);
                            mid_pos = (end_x + x_adjustment) + ',' + (end_y - y_adjustment);
                            end_pos = (end_x + x_adjustment) + ',' + (start_y - y_adjustment);
                        }
                        if (end_x>start_x && end_y>start_y) {
                            // forth quadrant
                            start_pos = (start_x - x_adjustment) + ',' + (end_y - y_adjustment);
                            mid_pos = (end_x - x_adjustment) + ',' + (end_y - y_adjustment);
                            end_pos = (end_x - x_adjustment) + ',' + (start_y - y_adjustment);
                        }
                        fill_points = start_pos + ' ' + mid_pos + ' ' + end_pos;
                        container.find("polyline.dummy_polyline").attr("points", fill_points);
                    }

                }

                // show right handle
                if (mobile_view) {
                    var left_x = start_x-handle_icon_width,
                        left_y = start_y-handle_icon_height/2,
                        right_x = end_x,
                        right_y = end_y-handle_icon_height/2;
                    // flip handles based on quadrant in which measurement is being drawn
                    // if (end_x < start_x) {
                    //     left_x = end_x;
                    //     left_y = end_y-handle_icon_height/2;
                    //     right_x = start_x+handle_icon_width;
                    //     right_y = start_y-handle_icon_height/2;
                    // }
                    if (horizontal_line && !vertical_line) {
                        container.find("image.left_handle").removeClass("hide").attr("x", left_x).attr("y", left_y);
                    } else {
                        // if both lines are drawn then adjust corner_edge size (bevel shape size adjustment)
                        left_x -= corner_edge;
                        container.find("image.left_handle").removeClass("hide").attr("x", left_x).attr("y", left_y);
                    }
                    container.find("image.right_handle").removeClass("hide").attr("x", right_x).attr("y", right_y);
                }
            } else {
                // show smallest messurement on first click
                var offset = stroke_width;
                setHorizontalPathData(time_path, CurrentPos[0], CurrentPos[0]+offset, CurrentPos[1], CurrentPos[1], corner_edge);
                setRectAttrFromPath(pathBgEl, time_path, '');
                updateTextLabelEl(container, CurrentPos[0], CurrentPos[1], CurrentPos[0]+offset, CurrentPos[1], 'default_value', 0, corner_edge);

                // show left handle
                if (mobile_view) {
                    // consider current position as left handle position as no previous position has been selected
                    container.find("image.left_handle").removeClass("hide").attr("x", CurrentPos[0]-handle_icon_width).attr("y", CurrentPos[1]-handle_icon_height/2);
                }
            }
        }

        /*
            Function to draw horizontal line
            - set Horizontal/Time Path attributes
        */
        function setHorizontalPathData(pathEl, x1, x2, y1, y2, adjustment) {
            // y coordinate is fixed for horizontal line, considering y1 i.e. start y as fixed y coordinate throught the line
            var fixed_y = y1;
            // y2 is to decide in which quadrant line is being drawn so as to flip the beveled shapes

            // flip drawn line only if buffer limit is crossed
            if (y2 > y1+adjustment) {
                // line in quadrant III or IV
                fixed_y -= adjustment;
                pathEl.attr({
                    "marker-start": "url(#left_down_arrow)",
                    "marker-end": "url(#right_down_arrow)",
                });
            } else {
                // line in quadrant I or II
                fixed_y += adjustment;
                pathEl.attr({
                    "marker-start": "url(#left_up_arrow)",
                    "marker-end": "url(#right_up_arrow)",
                });
            }

            // decide starting point as lowest x point among previous and current point
            var time_path_data = '';
            if (x1 < x2) {
                time_path_data = "M" + x1 + ',' + fixed_y + ' L' + x2 + ',' + fixed_y;
            } else {
                time_path_data = "M" + x2 + ',' + fixed_y + ' L' + x1 + ',' + fixed_y;
            }

            // draw path using path data
            pathEl.attr({
                "d": time_path_data,
            });
        }

        /*
            Function to draw vertical line
            - set Vertical/Voltage Path attributes
        */
        function setVerticalPathData(pathEl, x1, x2, y1, y2, adjustment) {
            // x coordinate is fixed for vertical line, considering x1 i.e. start x as fixed x coordinate throught the line
            var fixed_x = x1;
            // x2 is to decide in which quadrant line is being drawn so as to flip the beveled shapes
            
            // flip drawn line only if buffer limit is crossed
            if (x2 < x1-adjustment) {
                // line in quadrant II or III
                fixed_x += adjustment;
                pathEl.attr({
                    "marker-start": "url(#up_left_arrow)",
                    "marker-end": "url(#down_left_arrow)",
                });
            } else {
                // line in quadrant I or IV
                fixed_x -= adjustment;
                pathEl.attr({
                    "marker-start": "url(#up_right_arrow)",
                    "marker-end": "url(#down_right_arrow)",
                });
            }

            // decide starting point as hightes y point among previous and current point
            var voltage_path_data = '';
            if (y1 < y2) {
                voltage_path_data = "M" + fixed_x + ',' + y2 + ' L' + fixed_x + ',' + y1;
            } else {
                voltage_path_data = "M" + fixed_x + ',' + y1 + ' L' + fixed_x + ',' + y2;
            }

            pathEl.attr({
                "d": voltage_path_data,
            });
        }

        /*
            Function to draw rectangle
            - set Rectangle attribute to allow dragging complete path (horizontal/vertical) drawn
        */
        function setRectAttrFromPath(rectEl, horizontal_pathEl, vertical_pathEl) {
            var horizontal_coord = '', vertical_coord = '';
            var x = 0, y = 0, width = 0, height = 0;
            var buffer = marker_height - marker_width;

            if (horizontal_pathEl && vertical_pathEl) {
                horizontal_coord = horizontal_pathEl[0].getBBox();
                vertical_coord = vertical_pathEl[0].getBBox();
                x = horizontal_coord.x + dummy_stroke_width;
                y = vertical_coord.y + dummy_stroke_width;
                width = horizontal_coord.width - dummy_stroke_width - buffer; // for vertical, width is 0
                height = vertical_coord.height - dummy_stroke_width - buffer; // for horizontal, height is 0
            } else if (horizontal_pathEl) {
                horizontal_coord = horizontal_pathEl[0].getBBox();
                x = horizontal_coord.x;
                y = horizontal_coord.y - 2*buffer;
                width = horizontal_coord.width;
                height = horizontal_coord.height + working_stroke_width + 2*buffer;
            } else if (vertical_pathEl) {
                vertical_coord = vertical_pathEl[0].getBBox();
                x = vertical_coord.x - buffer;
                y = vertical_coord.y;
                width = vertical_coord.width + working_stroke_width + 2*buffer;
                height = vertical_coord.height;
            }

            setRectAttr(rectEl, x, y, width, height);
        }

        /*
            Function to update text value in svg text element
            - set text svg element for time and volt axis
            - Note that text position is relative to transparent rectangle set using setRectAttr function
        */
        function updateTextLabelEl(container, start_x, start_y, end_x, end_y, time_scale, volt_scale, adjustment) {
            // console.log("creating text label element");
            var x, y, dx, dy, textValue, bg_width, bg_height, offset_pos;
            bg_width = 70;
            bg_height = 24;
            offset_pos = 20;

            // Default value of x and y  for conversion ( x pixels = 1 ms and y pixel = 1mV)
            // x 49px =  200 ms, y 49px = 0.5 mV
            // divide time by 49p and then multiply result with 200 to get time in ms
            // divide voltage by 49 and then multiple result with 0.5 to get voltage in mV

            if (time_scale != 0){

                var temp;
                if (time_scale == 'default_value') {
                    temp = get_time_volt(start_x, end_x, 0);
                } else {
                    temp = get_time_volt(start_x, end_x, time_scale);
                }

                x = start_x;
                y = start_y + offset_pos;
                var rect_width = temp[1];
                var rect_height = bg_height;
                textValue = temp[0]+" ms";
                // console.log(textValue, "ms");

                // below if is to flip the position of text horizontally
                if (end_x < start_x-adjustment) {
                    x = end_x;
                }
                // below if is to flip the position of text vertically
                if (end_y > start_y+adjustment) {
                    y -= 2*offset_pos;
                    y -= rect_height;
                }

                var textEl = container.find("text.time");
                setRectAttr(textEl.siblings('rect.container'), x, y, rect_width, rect_height);
                setTextAttr(textEl, x+rect_width/2, y+rect_height/2, 0, 0, textValue);
                set_text_bg(textEl);
            }
            
            if (volt_scale != 0) {
                var temp = get_time_volt(start_y, end_y, volt_scale);

                x = start_x-offset_pos-bg_width;
                y = end_y;
                var rect_width = bg_width;
                var rect_height = temp[1];
                textValue = temp[0] + " mv";
                // console.log(textValue, "mV");

                // below if is to flip the position of text vertically
                if (end_x < start_x-adjustment) {
                    x = start_x+offset_pos;
                }
                // below if is to flip the position of text horizontally
                if (end_y > start_y+adjustment) {
                    y = start_y;
                }

                var textEl = container.find("text.voltage");
                setRectAttr(textEl.siblings('rect.container'), x, y, rect_width, rect_height);
                setTextAttr(textEl, x+rect_width/2, y+rect_height/2, 0, 0, textValue);
                set_text_bg(textEl);
            }
        }

        // calculate time/volt based on scale
        function get_time_volt(start, end, scale) {
            start = parseFloat(start);
            end = parseFloat(end);
            scale = parseFloat(scale);
            var time_volt = 0, diff = 0;
            if (end > start) {
                time_volt = (end - start) * scale;
                diff = end - start;
            } else {
                time_volt = (start - end) * scale;
                diff = start - end;
            }
            return [
                roundTo(time_volt, 2).toString().replace(".", ","),
                Math.round(diff)
            ];
        }

        // set text attributes and set rectangle attributes to set background for text
        function setTextAttr(textEl, x, y, dx, dy, value) {
            textEl.attr({
                x: x,
                y: y,
                dx: dx,
                dy: dy,
                'fill': default_font_color,
                'font-size': working_font_size,
                'font-family': default_font_family,
                'alignment-baseline': 'middle',
                'text-anchor': 'middle',
            }).text(value);
        }

        // set text background in sibling rectangle
        function set_text_bg(textEl, animation_delay) {
            animation_delay = typeof animation_delay !== 'undefined' ? animation_delay : default_transition_delay;
            // text background size is based on text size
            var svgrect = textEl[0].getBBox();
            var x = svgrect.x-1,
                y = svgrect.y,
                width = svgrect.width+2,
                height = svgrect.height;
            textEl.siblings('rect.bg').each(function () {
                var rectEl = $(this);
                setRectAttr(rectEl, x, y, width, height);
                rectEl.css({
                    'transition': animation_delay,
                });
            });
        }

        /*
            Utility function to set SVG Rectangle attributes
        */
        function setRectAttr(rectEl, x, y, width, height) {
            rectEl.each(function () {
                $(this).attr({
                    x: roundTo(x,2),
                    y: roundTo(y,2),
                    width: roundTo(width,2),
                    height: roundTo(height,2),
                });
            });
        }

        /*
            Utility function to round off 
            - used to round off x, y  co-ordinates of points selected
        */
        function roundTo(n, digits) {
            var negative = false;
            if (digits === undefined) {
                digits = 0;
            }
            if (n < 0) {
                negative = true;
                n = n * -1;
            }
            var multiplicator = Math.pow(10, digits);
            n = parseFloat((n * multiplicator).toFixed(11));
            n = (Math.round(n) / multiplicator).toFixed(2);
            if (negative) {
                n = (n * -1).toFixed(2);
            }
            return parseFloat(n);
        }

        /*
            Function to handle QT calculator operation
        */
        function handle_qtc(toolbar_container) {
            if (is_qtc_enabled) {
                spanToInput();
                var qtc_container = active_prob.find(".qtc-calc-container");
                toolbar_container.find(".calculator_toolbar").click(function () {
                    qtc_container.toggleClass("hide");
                    $(this).find("span").toggleClass("active");
                    $(this).find("p").toggleClass("active");
                });
                // $("button.calc-qtc-btn").click(function (e) {
                //     calcQTc(qtc_container);
                // });

                $("#qtTime, #hrate, .qtc-hfreq input").on("keypress", function (e) {
                    return checkNumberInput(e);
                });

                $("#qtTime, #hrate").on("input change", function (e) {
                    calcQTc(qtc_container);
                });
                $("#hrate").on("input change", function (e) {
                    var herz = calcHerz($(this), e);
                    $(this).siblings(".qtc-hfreq").find(".qtc-hfreq-result .span-el-inner").html(convertDecimalToComma(herz) + " bpm");
                });
                $(".qtc-hfreq input").on("input change", function (e) {
                    var herz = calcHerz($(this), e);
                    $("#hrate").val(convertDecimalToComma(herz));
                    calcQTc(qtc_container);
                });
                qtc_container.find(".qtc-formula-btn").click(function () {
                    var qtcFormulaEl = qtc_container.find(".qtc-formula");
                    if (qtcFormulaEl.hasClass("hide")) {
                        qtcFormulaEl.removeClass("hide");
                        $(this).text("Formel ausblenden"); /* Text: Hide formula */
                    } else {
                        qtcFormulaEl.addClass("hide");
                        $(this).text("Formel einblenden"); /* Text: Show formula */
                    }
                });
            }
        }

        // Herzfreq calculator
        function calcHerz(el, e) {
            var elVal = el.val();
            var herz = 0;
            if (elVal) {
                var bpm = 60000 / parseFloat(convertCommaToDecimal(elVal));
                if (bpm && bpm > 0) {
                    herz = Math.round(bpm * 100) / 100;
                }
            }
            return herz;
        }

        function convertCommaToDecimal(s) {
            return String(s).replace(",", ".");
        }

        function convertDecimalToComma(s) {
            return String(s).split(".")[0]
            // return String(s).replace(".", ",");
        }

        function checkNumberInput(e) {
            var charCode = (e.which) ? e.which : e.keyCode;
            if ((charCode > 31 && (charCode < 48 || charCode > 57)) && charCode != 44) {
                return false;
            }
            return true;
        }

        function calcQTc(qtc_container) {
            
            var qtc = calcQTcValue(); 
            if(qtc) {
                printQTcResult(qtc, qtc_container);
            }
        }

        // QT calculator
        function calcQTcValue(bpm) {
            if (!bpm) {
                var bpm = calcHerz($("#hrate"));
            }
            var qtime = parseFloat(convertCommaToDecimal($("#qtTime").val()));
            if (qtime && bpm) {
                // var qtc = qtime / (Math.sqrt(60 / hrate));
                var qtc = qtime / (Math.sqrt(60 / bpm));
                qtc = Math.round(qtc * 100) / 100;
                return qtc;
            }
        }

        function printQTcResult(qtc, qtc_container) {
            
            var resultEl = qtc_container.find(".qtc-result");
            resultEl.find(".qtc-result-val").html(convertDecimalToComma(qtc) + " ms");
            // resultEl.removeClass('hide');
        }

        function spanToInput () {
            var containerEl = $(".span-input");
            var spanEl = containerEl.find("span.span-el");
            var inputEl = containerEl.find("input");
        
            spanEl.click(function (e) {
                var el = $(this).find(".span-el-inner");
                var val = $(this).text().split(" ")[0];
                if (val) {
                    var currInput = $(this).siblings("input");
                    currInput.val(val);
                    $(this).addClass("hide");
                    currInput.removeClass("hide");
                    currInput.focus();
                    setTimeout(function () {
                        $("body").on("click", function (e) {
                            if ($(e.target).is(inputEl)) {
                                e.stopImmediatePropagation()
                                return false;
                            }
                            closeInputEl(e);
                        });
                        inputEl.on("keydown", function (e) {
                            if (e.key === "Escape" || e.key === "Enter") {
                                closeInputEl(e);
                            }
                        })
                    }, 500);

                    function closeInputEl(e) {
                        var dataAppend = el.data("append") ? el.data("append") : "";
                        el.html(currInput.val() + dataAppend);
                        currInput.addClass("hide");
                        el.parent().removeClass("hide");
                        $("body").unbind("click");
                        $("body").unbind("keydown");
                    }
                }
            })
        }
    });
});

// /* 
//     Generates QTc calculator HTML
// */
// qtc_html += getQTCHtml();
// function getQTCHtml() {

//     // Removed Calculate button
//     // <button class="btn btn-primary calc-qtc-btn">Calculate</button> 
    
//     return '<div class="qtc-calc-container hide"><div class="qtc-col qtc-col-1"><div class="form-group"> <label for="hrate">RR Abstand<span class="qtc-calc-ruler"></span></label> <input id="hrate" type="text" class="form-control" placeholder="0 ms"> <div class="qtc-hfreq span-input"><span>Herzfrequenz:&nbsp;</span><span class="qtc-hfreq-result span-el"><span class="span-el-inner" data-append=" bpm">0 bpm </span> <span class="edit-icon"></span> </span> <input type="text" class="hide"> </div> </div>  <div class="form-group"> <label for="qtTime">QT-Zeit <span class="qtc-calc-ruler"></span> </label> <input id="qtTime" type="text" class="form-control"  placeholder="0 ms"> </div> <div class="qtc-result"><span>QTc: </span><span class="qtc-result-val">0 ms</span>  </div><div class="qtc-footer"><span>Norm: 350-400 ms</span>  </div></div><div class="qtc-col qtc-col-2"><div class="qtc-formula-container"><div class="qtc-formula hide">  <span><img src="/static/ekgtraining/images/qtc_formula_bpm.png" alt=""></span><img src="/static/ekgtraining/images/qtc_formula.png" alt=""></div><button class="qtc-formula-btn btn">Formel einblenden</button> </div> </div></div>';
// }