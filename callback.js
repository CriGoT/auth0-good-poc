(function () {
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
      if (y < 1950) { y = ""}

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


  var fieldsets = document.querySelectorAll("fieldset");
  function hide (el) {
    el.style.display = "none"
  }
  function show (el) {
    el.style.display = "block"
  }
  fieldsets.forEach(function (fieldset, index) {
    var nextFieldset = fieldsets[index + 1];
    if (index > 0) hide(fieldset)
    var prevFieldset = fieldsets[index - 1];
    if (!nextFieldset) {
      /* Submit */
    }
    var btnNext = fieldset.querySelector(".btn-next");
    var btnPrev = fieldset.querySelector(".btn-prev");
    var commonClick = function (e) {
      hide(fieldset);
    }
    if (prevFieldset && btnPrev) {
      btnPrev.onclick = function (e) {
        e.preventDefault();
        commonClick(e)
        show(prevFieldset);
      }
    }
    if (nextFieldset && btnNext) {
      btnNext.onclick = function (e) {
        e.preventDefault();
        var checkEl = fieldset.querySelector("#checkboxTerms");
        var birthday = fieldset.querySelector("#birthday");
        if (checkEl && !checkEl.checked) {
          return FNNAuth.showError("You have to agree!!!!");
        }  
        var isInvalidBirthday = birthday && (
          !/^\d{4}-\d{2}-\d{2}$/.test(birthday.value) ||
          isNaN(new Date(birthday.value).getTime())
        );
        if (isInvalidBirthday) {
          return FNNAuth.showError("Enter a valid birthday date.");
        } 
        commonClick(e)
        show(nextFieldset);
      }
    }
  })
})()