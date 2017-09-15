(function(root) {
    // Storage keys
    var storagePrefix = "fnnauth:";
    var storageTokenKey = storagePrefix + "accessToken";
    var storageProfileKey = storagePrefix + "profile";
    var storageTargetUrlKey = storagePrefix + "targetUrl";

    var storage = root.sessionStorage;
    var document = root.document;
    var auth0jslocation = "https://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";
    var profileApiUrl = "https://testing-foxnews.us.webtask.io/userprofile";



    if (root.FNNAuth) {
        return;
    }

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
            var mlength;
            if (m === "2") {
                mlength = 28 + (!(y & 3) && ((y % 100) !== 0 || !(y & 15)));
            } else { mlength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
            kcday.length = 0;
            for (var i = 1; i <= mlength; i++) {
                var opt = new Option();
                opt.value = opt.text = i;
                if (i === d) {opt.selected = true;}
                kcday.add(opt);
            }

            // 1 --> 01
            if (d <= 9) { d = "0" + d; }
            if (m <= 9) { m = "0" + m; }

            // Make the year invalid, so it won't pass later.
            if (y < 1950) { y = ""; }

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

        if (kcbirthday.value) {
            var existingDate = new Date(kcbirthday.value);
            // Set the month
            kcmonth.value = String(existingDate.getMonth() + 1);
            kcmonth.dispatchEvent(new Event("change"));

            // Set the day
            kcday.value = String(existingDate.getDate());
            kcday.dispatchEvent(new Event("change"));

            // Set the year
            kcyear.value = String(existingDate.getFullYear());
            kcyear.dispatchEvent(new Event("change"));
        }
    }



    var domain;
    var redirect;
    var containerElement;
    var webAuth;
    var options;

    var showError = function(err) {
        swal({
            type: "error",
            title: "Uh Oh",
            text: err.message || err
        });
    };

    var setAuthAttributeInBody = function() {
        document.body.setAttribute("data-auth", isAuthenticated().toString());
    };

    var callProfileApi = function(method, body, callback) {
        if (callback === undefined) {
            callback = body;
            body = undefined;
        }

        if (!isAuthenticated()) { return callback(new Error("The user has to login to set the profile"));}

        silentLogin(setResult(function(err, authResult) {
            if (!isAuthenticated()) {return callback(new Error("The user has to login to set the profile"));}

            var req = new XMLHttpRequest();
            req.open(method, profileApiUrl);
            req.setRequestHeader('Authorization', 'Bearer ' + retrieveAccessToken());
            req.setRequestHeader('Content-type', 'application/json');
            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    if (req.status >= 400) {
                        var err = req.responseText;
                        try {
                            err = JSON.parse(err);
                            err = err.message || err.error;
                        } catch (e) {}

                        return callback(new Error(err));
                    }
                    callback(null, req.responseText && JSON.parse(req.responseText));
                }
            };
            try {
                req.send(body && JSON.stringify(body));
            } catch (e) {
                callback(e);
            }
        }));
    };


    var getDomainOptions = function(domain) {
        if (!options) {
            // This is defined in options.js
            options = DOMAIN_OPTIONS[domain];
        }
        return options;
    };

    var loadJs = function(src, callback) {
        var script = document.createElement("script");
        script.onload = callback;
        script.src = src;
        document.head.appendChild(script);
    };

    var store = function(key, value) {
        if (value !== undefined) {
            storage.setItem(key, JSON.stringify(value));
        } else {
            storage.removeItem(key);
        }
    };

    var retrieve = function(key) {
        return JSON.parse(storage.getItem(key));
    };

    //binding the value to 'this' & adding it or retrieving it from storage 
    var storeAccessToken = store.bind(null, storageTokenKey);
    var storeProfile = store.bind(null, storageProfileKey); // storeProfile({...}) the equivalent of store("fnnauth:profile", {...})
    var storeTargetUrl = store.bind(null, storageTargetUrlKey);
    var retrieveAccessToken = retrieve.bind(null, storageTokenKey);
    var retrieveProfile = retrieve.bind(null, storageProfileKey);
    var retrieveTargetUrl = retrieve.bind(null, storageTargetUrlKey); // retrieveTargetUrl() instead of retrieve("fnnnauth:...")

    var setResult = function(callback, updateProfile) {
        return function(err, authResult) {
            storeAccessToken(authResult && authResult.accessToken);

            //this is removing the cached version of the profile
            //optimizing it by checking if id token exists, otherwise we don't need to call it
            if (updateProfile) {
                storeProfile(authResult && authResult.idTokenPayload);
            }

            callback(err, authResult);
        };
    };

    var createLink = function(text, className, callback) {
        var link = document.createElement("a");
        link.className = className;
        link.innerHTML = text;
        if (link.addEventListener) {
            link.addEventListener('click', callback);
        } else {
            link.attachEvent('onclick', callback);
        }
        return link;
    };

    var changePassword = function() {
        swal({
            title: 'Change Password',
            text: "Are you sure you want to change your password?",
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes!',
            cancelButtonText: 'No, cancel!'
        }).then(function() {
            swal.showLoading();
            getWebAuth(function(webAuth) {
                // This will send an email
                getUserProfile(function(err, profile) {
                    if (err) {
                        err.message = err.message || err.description;
                        return swal({ type: "error", title: "Uh Oh", text: err.message });
                    }
                    webAuth.changePassword({
                        connection: 'Username-Password-Authentication',
                        email: profile.email
                    }, function(err, resp) {
                        if (err) {
                            err.message = err.description;
                            swal({ type: "error", title: "Uh Oh", text: err.message });
                        } else {
                            swal({ type: "success", title: "Success", text: "An email has been sent to your inbox." });
                        }
                    });
                });
            });
        });
    };

    var deleteUserProfileApi = function(callback) {
        callProfileApi("DELETE", callback);
    };

    var deleteAccount = function() {
        swal({
            title: 'Delete Account',
            text: "Are you sure you want to delete your account?",
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes!',
            cancelButtonText: 'No, cancel!'
        }).then(function() {

            setTimeout(function() {
                swal.showLoading();
                getUserProfile(function(err, profile) {
                    if (err) {
                        err.message = err.message || err.description;
                        return swal({ type: "error", title: "Oops!", text: err.message });
                    }

                    deleteUserProfileApi(function(err) {
                        if (err) {
                            err.message = err.description;
                            swal({ type: "error", title: "uh oh", text: err.message });
                        } else {
                            swal({ type: "success", title: "Sorry to see you go!", text: "" }).then(function() {
                                startLogout();
                            });
                        }
                    });
                });
            }, 1000);

        });
    };

    var profileHandlers = function(profile) {
        // Handle change password
        document.getElementById("change-pass").addEventListener("click", changePassword);
        document.getElementById("delete-account").addEventListener("click", deleteAccount);
        // var backBtn = document.getElementById("back-button");
        // Hide the back button if the previous page is not on the same domain
        // if (document.referrer.indexOf(location.hostname) === -1) {
        //     backBtn.style.display = "none";
        // } else {
        //     backBtn.addEventListener("click", function() {
        //         history.go(-1);
        //     })
        // }
    };

    var renderProfileFields = function(profile) {
        // Display dynamic fields in the profile, using the data-user-field attribute
        var elements = document.querySelectorAll("[data-user-field]");
        for (var i = elements.length - 1; i >= 0; i--) {
            var el = elements[i];
            var field = el.getAttribute("data-user-field");
            var value = profile[field] || profile["https://example.com/" + field];
            if (el.tagName === "IMG") {
                el.setAttribute("src", value);
            } else {
                el.textContent = value;
            }
        }
    };


    var setupProfileEditor = function(profile) {



        // Get the metadata
        var metadata = profile["https://example.com/metadata"] || {};
        if (!metadata.agreed_terms) {
            startLogout();
            document.body.classList.add("hide");
            return;
        }

        //check if user verified email before showing profile
        // if (!profile.email_verified) {          
        //     document.body.classList.add("hide")
        //     alert("please verify your email");
        //     return;
        // }


        // We make the true/false string in to a boolean
        // This is a hack
        //       If there are humans with weird names like "false" or "true", this will probably fail.
        Object.keys(metadata).forEach(function(key) {
            if (["true", "false"].includes(metadata[key])) {
                metadata[key] = metadata[key] === "true";
            }
        });


        var profileEditor = document.getElementById('profile-editor');
        console.log(profile);

        var newsletters = metadata.newsletters;

        profileEditor.querySelector("[data-schemapath='root.email'] > div > input").value = profile.email;
        profileEditor.querySelector("[data-schemapath='root.birthday'] > div > input").value = metadata.birthday;
        profileEditor.querySelector("[data-schemapath='root.first_name'] > div > input").value = metadata.first_name;
        profileEditor.querySelector("[data-schemapath='root.last_name'] > div > input").value = metadata.last_name;
        profileEditor.querySelector("[data-schemapath='root.display_name'] > div > input").value = metadata.display_name;
        profileEditor.querySelector("[data-schemapath='root.zip_code'] > div > input").value = metadata.zip_code || "";

        profileEditor.querySelector("[data-schemapath='root.party'] > div > select").value = metadata.party;
        profileEditor.querySelector("[data-schemapath='root.gender'] > div > select").value = metadata.gender;

        profileEditor.querySelector("[data-schemapath='root.fb_breaking_alerts'] input").checked = newsletters.fb_breaking_alerts;
        profileEditor.querySelector("[data-schemapath='root.fn_breaking_alerts'] input").checked = newsletters.fn_breaking_alerts;
        profileEditor.querySelector("[data-schemapath='root.fn_morn_headlines'] input").checked = newsletters.fn_morn_headlines;
        profileEditor.querySelector("[data-schemapath='root.top_headline'] input").checked = newsletters.top_headline;

        setupBirthdaySelects();

        document.querySelector("#link-google").addEventListener("click", function(e) {
            e.preventDefault();
            linkAccounts('google-oauth2', function(err){
                if (!err) swal({ type: "success", title: "Accounst Linked!" });
            });
        });

        // Save the metadata, when we click on the save button
        document.querySelector("#save-profile").addEventListener("click", function() {

            var profileEditor = document.getElementById('profile-editor');

            metadata.first_name = profileEditor.querySelector("[data-schemapath='root.first_name'] > div > input").value;
            metadata.birthday = profileEditor.querySelector("[data-schemapath='root.birthday'] > div > input").value;
            metadata.last_name = profileEditor.querySelector("[data-schemapath='root.last_name'] > div > input").value;
            metadata.display_name = profileEditor.querySelector("[data-schemapath='root.display_name'] > div > input").value;
            metadata.party = profileEditor.querySelector("[data-schemapath='root.party'] > div > select").value;
            metadata.gender = profileEditor.querySelector("[data-schemapath='root.gender'] > div > select").value;
            metadata.zip_code = profileEditor.querySelector("[data-schemapath='root.zip_code'] > div > input").value || "";
            metadata.newsletters = {
                fb_breaking_alerts: profileEditor.querySelector("[data-schemapath='root.fb_breaking_alerts'] input").checked,
                fn_breaking_alerts: profileEditor.querySelector("[data-schemapath='root.fn_breaking_alerts'] input").checked,
                fn_morn_headlines: profileEditor.querySelector("[data-schemapath='root.fn_morn_headlines'] input").checked,
                top_headline: profileEditor.querySelector("[data-schemapath='root.top_headline'] input").checked,
                fn_opinion_headlines: profileEditor.querySelector("[data-schemapath='root.fn_opinion_headlines'] input").checked,
                fn_fox_411_newsletter: profileEditor.querySelector("[data-schemapath='root.fn_fox_411_newsletter'] input").checked,
                fn_science_and_technology: profileEditor.querySelector("[data-schemapath='root.fn_science_and_technology'] input").checked,
                fb_morning_headlines: profileEditor.querySelector("[data-schemapath='root.fb_morning_headlines'] input").checked,
                fn_health_newsletter: profileEditor.querySelector("[data-schemapath='root.fn_health_newsletter'] input").checked,
                fb_most_popular_content: profileEditor.querySelector("[data-schemapath='root.fb_most_popular_content'] input").checked,
                fox_fan_scoop: profileEditor.querySelector("[data-schemapath='root.fox_fan_scoop'] input").checked,
                fox_nation_fired_up: profileEditor.querySelector("[data-schemapath='root.fox_nation_fired_up'] input").checked,
                halftime_report: profileEditor.querySelector("[data-schemapath='root.halftime_report'] input").checked




            };


            // var errors = profileEditor.validate()
            var errorsContainer = document.querySelector("#errors");
            errorsContainer.innerHTML = "";
            if (errors.length) {
                errors.forEach(function(err) {
                    // if (err.path === "root.newsletter_email") {
                    // err.message = "Invalid newsletter email";
                    // }
                    if (err.path === "root.birthday") {
                        err.message = "Invalid Birthday - Must be in the format 'YYYY-MM-DD'";
                    }
                    err.elm = document.createElement("div");
                    err.elm.textContent = err.message;
                    err.elm.setAttribute("class", "error");
                    errorsContainer.appendChild(err.elm);
                });

                return;
            }
            swal.showLoading();


            setUserMetadata(metadata, function(err) {
                if (err) {
                    return showError(err);
                }
                swal({ type: "success", title: "Saved!" });
            });
        });
    };

    var renderUserInfo = function() {
        getUserProfile(function(err, profile) {
            if (err) {
                console.error("Error retrieving the user profile", err);
                return;
            }

            profileHandlers(profile);
            renderProfileFields(profile);
            setupProfileEditor(profile);
        });
    };

    var createWebAuth = function() {
        webAuth = webAuth || new auth0.WebAuth(options.default);
        return webAuth;
    };

    var loadAuth0js = function(callback) {
        if (!root.auth0) {
            loadJs(auth0jslocation, function() {
                callback(createWebAuth());
            });
        } else {
            callback(createWebAuth());
        }
    };

    var getWebAuth = function(callback) {
        loadAuth0js(function() {
            //options.default.audience = "https://sso.foxnews.com/userinfo"
            webAuth = webAuth || new root.auth0.WebAuth(options.default);
            callback(webAuth);
        });
    };

    var silentLogin = function(callback) {

        // Renew auth (basically, login)
        getWebAuth(function(webAuth) {
            webAuth.renewAuth(options.silent, setResult(callback));
        });
    };


    // User/Password  
    //                    ------- Sign in/up ---> check if agreed terms (callback.html)
    // Google/Facebook                            |    |
    //                                            |    v
    //                                            YES  NO
    //                                            |     Show the after sign up page
    //                                            |     Agree
    //                                            |     |
    //                                            |     |
    //                                             \    v
    //                                              \-> Yaaay


    var auth0Logout = window.auth0logout = function(cb) {
        getWebAuth(function(webAuth) {
            var iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = webAuth.client.buildLogoutUrl();
            iframe.onload = iframe.onerror = cb;
            document.body.appendChild(iframe);
            /*
                        setTimeout(function() {
                            document.body.removeChild(iframe);
                        }, 1500);*/
        });
    };

    var startLogout = function(e) {
        if (e) { e.preventDefault(); }

        // Empty the storage data (by not passing anything)
        storeAccessToken();
        storeProfile();
        swal.showLoading();
        auth0Logout(function() {
            location.reload();
        });
    };

    var startLogin = function(e) {
        if (e){ e.preventDefault();}

        storeTargetUrl(window.location.href);
        getWebAuth(function(webAuth) {
            // QUESTION: options.popup.ignoreCasing = true
            // Alice True
            // First: Alice
            // Last: [x] 

            // Question: storing boolean values, without converting into strings?
            //           subscribed: false instead of "false"
            webAuth.authorize(options.authorize);
        });
    };

    var authnCallback = function(err, authResult) {
        if (err || !authResult || !authResult.accessToken) {
            console.log("Unsuccessful attempt to login", err, authResult);
        } else {
            console.log("Login completed successfully");
            renderUserInfo();
        }
        setAuthAttributeInBody();
    };

    var getUserProfile = function(callback, useSilentLogin) {
        if (!isAuthenticated()) {return callback(new Error("The user has to login to get the profile"));}
        useSilentLogin = useSilentLogin !== false;

        // Try to get it from the storage
        var profile = retrieveProfile();

        // If it's cached in the storage, we stop here and callback
        if (profile){ return callback(null, profile);}

        //retrieve from Auth0
        var token = retrieveAccessToken();

        getWebAuth(function(webAuth) {
            webAuth.client.userInfo(token, function(err, user) {
                if (err) {
                    if (useSilentLogin) {
                        //Most likely access token has expired try silent login to renew
                        silentLogin(getUserProfile.bind(null, callback, false));
                    } else {
                        return callback(err);
                    }
                }

                // Cache the profile in storage after getting it
                storeProfile(user);

                callback(null, user);
            });
        });
    };

    var getUserManagement = function(cb) {
        silentLogin(setResult(function(err, authResult) {
            loadAuth0js(function() {
                var mgmt = new root.auth0.Management({
                    domain: options.default.domain,
                    token: authResult.idToken
                });
                cb(mgmt);
            });
        }));
    };

    var setUserProfile = window.setUserProfile = function(profile, callback) {
        callProfileApi("PATCH", profile, function(err, data) {
            if (err){ return callback(err);}
            // we get a new token to get the updated profile
            silentLogin(setResult(function() {
                getUserProfile(callback);
            }, true));
        });
    };

    // Use the management varructor to patch the user metadata
    // and store the the updated profile in the storage
    var setUserMetadata = function(profile, callback) {
        if (!isAuthenticated()) {return callback(new Error("The user has to login to set the profile"));}

        /*silentLogin(setResult(function(err, authResult) {
            if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));
            getUserManagement(function(mgmt) {
                mgmt.patchUserMetadata(authResult.idTokenPayload.sub, profile, function(err, user) {
                    if (err) return callback(err);
                    // we get a new token to get the updated profile
                    silentLogin(setResult(function() {
                        getUserProfile(callback);
                    }, true));
                });
            });
        }));*/

        setUserProfile({ user_metadata: profile }, callback);
    };

    var isAuthenticated = function() {
        return !!retrieveAccessToken();
    };

    const linkAccounts = (connection, callback) => {
        getWebAuth(function(webAuth) {
            try {
                const popupHandler = webAuth.popup.preload();
                getUserManagement(function(mgmt) {
                    const primaryProfile = retrieveProfile();
                    webAuth.popup.authorize(
                        Object.assign(
                            options.link || {},
                            { connection: connection, popupHandler: popupHandler}
                        ), function (err, authResult) {
                            if(err) return callback(err);
            
                            if (authResult.idToken) {
                                mgmt.linkUser(primaryProfile.sub, authResult.idToken, callback);
                            }
                        });
                });
            } catch(e) {
                // TODO: Popup blocker warn or similar 
                console.warn('Popup blocker avoid displaying window to do account linking');
            }
        });
    }

    var login = function(callback) {
        if (isAuthenticated()) {
            getUserProfile(callback);
        } else {
            silentogin(function(err, authResult) {
                if (err) {return callback(err);}

                if (isAuthenticated()) {
                    getUserProfile(callback, false);
                } else {
                    startLogin();
                }
            });
        }
    };

    var initialize = function(profileElSel, loginElSel) {

        // Get elements from the DOM, based on the ids
        profileElement = document.getElementById(profileElSel);
        loginElement = document.getElementById(loginElSel);

        // Create the login/logout buttons
        var loginBtn = document.querySelector("a.login");
        var logoutBtn = document.querySelector(".fnnauth0-logout");
        var changePassEl = document.getElementById("change-pass");

        if (!loginBtn) {
            loginElement.appendChild(createLink("Login", "fnnauth0-login", startLogin));
        } else {
            loginBtn.onclick = startLogin;
        }

        if (!logoutBtn) {
            if (changePassEl) {
                changePassEl.parentElement.insertBefore(createLink("Log Out", "fnnauth0-logout", startLogout), document.getElementById("change-pass"));

            }

        } else {
            logoutBtn.onclick = startLogout;
        }

        // Set auth state in the body element
        setAuthAttributeInBody();

        // Eventually render the user info, if authenticated. Otherwise, the login view
        if (isAuthenticated()) {
            renderUserInfo();
        } else {
            silentLogin(authnCallback);
        }
    };

    // Class varructor
    var FNNAuth = function(domainName, useRedirect) {
        domain = domainName || root.location.hostname;
        redirect = useRedirect !== false;
        options = getDomainOptions(domain);
    };

    // Methods
    FNNAuth.prototype.initialize = initialize;
    FNNAuth.prototype.login = login;
    FNNAuth.prototype.isAuthenticated = isAuthenticated;
    FNNAuth.prototype.getUserProfile = getUserProfile;
    FNNAuth.prototype.setUserMetadata = setUserMetadata;

    var staticInitialize = function(profileElement, loginElement, domain, redirect) {
        var instance = new FNNAuth(domain, redirect);
        instance.initialize(profileElement, loginElement);
    };

    // Question:
    // Why camelCase by default ONLY on login? Not on the other routes.

    // After login (called from callback.html)
    var handleCallback = function(domain) {
        options = getDomainOptions(domain || root.location.hostname);
        setupBirthdaySelects();
        getWebAuth(function(webAuth) {
            // This is a popup window so this was created to link accounts
            // TODO: add some internal state to validate the linking
            if (window.opener) { return webAuth.popup.callback(); }

            webAuth.parseHash(setResult(function(err, authResult) {
                var redirectUser = function() {
                    var redirect = retrieveTargetUrl() || root.location.origin;
                    storeTargetUrl();
                    root.location.href = redirect;
                };

                if (err) { return redirectUser(); }

                getUserProfile(function(err, profile) {
                    if (err) { return showError(err); }
                    var metadata = profile["https://example.com/metadata"];
                    if (metadata.agreed_terms) {
                        return redirectUser();
                    }

                    var firstName = document.getElementById("first_name");
                    var lastName = document.getElementById("last_name");
                    var displayName = document.getElementById("display_name");
                    var birthday = document.getElementById("birthday");
                    var gender = document.getElementById("gender");
                    var party = document.getElementById("party");



                    //display name in root that is used for prefilling field
                    displayName.value = profile["https://example.com/display_name"];

                    document.body.classList.remove("hide");
                    document.querySelector("form.new-user").addEventListener("submit", function(e) {
                        e.preventDefault();
                        swal.showLoading();

                        metadata.agreed_terms = document.querySelector("#checkboxTerms").checked;
                        metadata.first_name = firstName.value;
                        metadata.last_name = lastName.value;
                        metadata.display_name = displayName.value;
                        metadata.birthday = birthday.value;
                        metadata.newsletters = {
                            fb_breaking_alerts: document.querySelector("#fb_breaking_alerts").checked,
                            fn_breaking_alerts: document.querySelector("#fn_breaking_alerts").checked,
                            fn_morn_headlines: document.querySelector("#fn_morn_headlines").checked,
                            top_headline: document.querySelector("#top_headline").checked
                            //     fn_opinion_headlines: document.querySelector('#fn_opinion_headlines').checked,
                            //     fn_fox_411_newsletter: document.querySelector('#fn_fox_411_newsletter').checked,
                            //     fn_science_and_technology: document.querySelector('#fn_science_and_technology').checked,
                            //     fb_morning_headlines: document.querySelector('#fb_morning_headlines').checked,
                            //     fn_health_newsletter: document.querySelector('#fn_health_newsletter').checked,
                            //     fb_most_popular_content: document.querySelector('#fb_most_popular_content').checked,
                            //     fox_fan_scoop: document.querySelector('#fox_fan_scoop').checked,
                            //     fox_nation_fired_up: document.querySelector('#fox_nation_fired_up').checked,
                            //     halftime_report: document.querySelector('#halftime_report').checked
                        };
                        metadata.gender = gender.value;
                        metadata.party = party.value;
                        setUserMetadata(metadata, function(err) {
                            if (err) {
                                return showError(err);
                            }
                            redirectUser();
                        });
                    });
                });

            }));
        });
    };

    // index.html             fnnauth.js
    // FNNAuth.initialize --> staticInitialize --> new FnnAuth().initialize

    //called in the html
    FNNAuth.initialize = staticInitialize;
    FNNAuth.handleCallback = handleCallback;
    FNNAuth.showError = showError;

    //making it global 
    root.FNNAuth = FNNAuth;
})(window);



//TO DO: make UI using vue.js
//Goal: silent login, browser compatible, newsletter integration, spot im integration, editing profile



//QUESTION: request.open('GET', '/authn/' + domain + ".json", false); --need to publish domain configs


//TO DO: linking users
//TO DO: connect with spot IM commenting
//TO DO: way to easily migrate users
//TO DO: add official logo