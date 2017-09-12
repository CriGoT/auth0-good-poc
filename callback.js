(function() {
    

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

})()