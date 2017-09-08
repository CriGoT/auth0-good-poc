(function() {
    function setupBirthdaySelects() {
        var kcyear = document.getElementsByName("birthday-year")[0],
            kcmonth = document.getElementsByName("birthday-month")[0],
            kcday = document.getElementsByName("birthday-day")[0],
            kcbirthday = document.getElementsByName("birthday")[0];

        kcyear.onchange = kcmonth.onchange = kcday.onchange = call;

        kcyear.addEventListener("change", validate_date);
        kcmonth.addEventListener("change", validate_date);

        function validate_date() {
            var y = +kcyear.value,
                m = kcmonth.value,
                d = kcday.value;
            if (m === "2")
                var mlength = 28 + (!(y & 3) && ((y % 100) !== 0 || !(y & 15)));
            else var mlength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
            kcday.length = 0;
            for (var i = 1; i <= mlength; i++) {
                var opt = new Option();
                opt.value = opt.text = i;
                if (i == d) opt.selected = true;
                kcday.add(opt);
            }

            // 1 --> 01
            if (d < 9) { d = "0" + d; }
            if (m < 9) { m = "0" + m; }

            // Make the year invalid, so it won't pass later.
            if (y < 1950) { y = "" }

            kcbirthday.value = [y, m, d].join("-");
        }

        function call() {
            var d = new Date();
            var n = d.getFullYear() - 13;
            for (var i = n; i >= 1950; i--) {
                var opt = new Option();
                opt.value = opt.text = i;
                kcyear.add(opt);
            }

            validate_date();
        }
    }

    setupBirthdaySelects();



    //hiding & displaying fieldsets for multi-step signup
    var fieldsets = document.querySelectorAll("fieldset");

    function hide(el) {
        el.style.display = "none"
    }

    function show(el) {
        el.style.display = "block"
    }
    fieldsets.forEach(function(fieldset, index) {
        var nextFieldset = fieldsets[index + 1];
        if (index > 0) hide(fieldset)
        var prevFieldset = fieldsets[index - 1];
        if (!nextFieldset) {
            /* Submit */
        }
        var btnNext = fieldset.querySelector(".btn-next");
        var btnPrev = fieldset.querySelector(".btn-prev");
        var commonClick = function(e) {
            hide(fieldset);
        }

        if (prevFieldset && btnPrev) {
            btnPrev.onclick = function(e) {
                e.preventDefault();

                $("#progressbar li").eq($("fieldset").index(fieldset)).removeClass("active");

                commonClick(e)
                show(prevFieldset);
            }
        }

        if (nextFieldset && btnNext) {
            btnNext.onclick = function(e) {
                e.preventDefault();

                //validations for required signup fields

                var hasSymbols = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

                var displayName = $("#display_name").val();

                if (hasSymbols.test(displayName)) {
                    return FNNAuth.showError("Invalid display name. No spaces or symbols.");
                }
                var checkEl = fieldset.querySelector("#checkboxTerms");
                var birthday = fieldset.querySelector("#birthday");
                if (checkEl && !checkEl.checked) {
                    return FNNAuth.showError("You have to agree to the terms...");
                }
                var isInvalidBirthday = birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday.value) ||
                    isNaN(new Date(birthday.value).getTime())
                );
                if (isInvalidBirthday) {
                    return FNNAuth.showError("Enter a valid birthday date.");
                }
                commonClick(e)

                //add active class to progress bar
                $("#progressbar li").eq($("fieldset").index(nextFieldset)).addClass("active");

                show(nextFieldset);
            }
        }
    });


    function setPoliticalSlider() {

        //political timeline functionality
        var container = $(".capture_slider_container"),
            holder = $(".capture_slider_base"),
            marker = $(".capture_slider_marker"),
            holderWidth = holder.width();


        var setMark = function(pageX, offset, type) {
          holderWidth = holder.width();

            var diff = pageX - offset;

            if (diff < 0) {

              diff = 0;

            } 

            if (diff > holderWidth) {
              diff = holderWidth;

            }


            // diff = (diff < 0) ? 0 : (diff > holderWidth) ? holderWidth : diff;

            console.log(diff);

            if (type === "drag") {
                marker.css("left", diff);
            } else {
                marker.animate({ left: diff });
            }

            var capVal = (parseInt(diff / holderWidth * 100, 10));

            // if (isNaN(capVal) !== true && capVal >= 0) {
            //     $("#capture_" + idText + "_politicalViewsRegistration").val(capVal);
            // }

        };

        holder.bind("click", function(evt) {

            var el = $(this),
                offset = el.offset();

            setMark(evt.pageX, offset.left, "click");

        });

        $(window).bind("mousedown", function() {

            container.bind("mousemove", function(evt) {
                var el = $(this),
                    offset = el.offset();
                setMark(evt.pageX, offset.left, "drag");
                console.log("evt: " + evt.pageX + "offset: " + offset.left);
            });

        }).bind("mouseup", function() {

            container.unbind("mousemove");

        });



    }

    setPoliticalSlider();

})()