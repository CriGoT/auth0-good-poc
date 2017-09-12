(function(root) {
    // Storage keys
    const storagePrefix = "fnnauth:";
    const storageTokenKey = storagePrefix + "accessToken";
    const storageProfileKey = storagePrefix + "profile";
    const storageTargetUrlKey = storagePrefix + "targetUrl";

    const storage = root.sessionStorage;
    const document = root.document;
    const auth0jslocation = "https://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";
    const profileApiUrl = "https://testing-foxnews.us.webtask.io/userprofile";
 

    if (root.FNNAuth) {
        return
    }

    var domain;
    var redirect;
    var containerElement;
    var webAuth;
    var options;

    const showError = function (err) {
        swal({
            type: "error",
            title: "Uh Oh",
            text: err.message || err
        });
    }

    const setAuthAttributeInBody = function() {
        document.body.setAttribute("data-auth", isAuthenticated().toString());
    }

    const callProfileApi = function(method, body, callback) {
        if (callback==undefined) {
            callback = body;
            body = undefined;
        }

        if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

        silentLogin(setResult(function(err, authResult) {
            if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

            const req = new XMLHttpRequest()
            req.open(method, profileApiUrl);
            req.setRequestHeader('Authorization', 'Bearer ' + retrieveAccessToken());
            req.setRequestHeader('Content-type', 'application/json');
            req.onreadystatechange = function() {
             if (req.readyState==4) {
                if (req.status >= 400 ) {
                    var err = req.responseText
                    try {
                        err = JSON.parse(err)
                        err = err.message || err.error
                    } catch (e) {}

                    return callback(new Error(err))
                }
                callback(null, req.responseText && JSON.parse(req.responseText));
              }
            };
            try {
              req.send(body && JSON.stringify(body));
            } catch(e) {
              callback(e);
            }
        }));
    };


    const getDomainOptions = function(domain) {
        if (!options) {
            // This is defined in options.js
            options = DOMAIN_OPTIONS[domain];
        }
        return options;
    }

    const loadJs = function(src, callback) {
        const script = document.createElement("script");
        script.onload = callback;
        script.src = src;
        document.head.appendChild(script);
    }

    const store = function(key, value) {
        if (value !== undefined) {
            storage.setItem(key, JSON.stringify(value));
        } else {
            storage.removeItem(key);
        }
    }

    const retrieve = function(key) {
        return JSON.parse(storage.getItem(key));
    }

    //binding the value to 'this' & adding it or retrieving it from storage 
    const storeAccessToken = store.bind(null, storageTokenKey);
    const storeProfile = store.bind(null, storageProfileKey); // storeProfile({...}) the equivalent of store("fnnauth:profile", {...})
    const storeTargetUrl = store.bind(null, storageTargetUrlKey);
    const retrieveAccessToken = retrieve.bind(null, storageTokenKey);
    const retrieveProfile = retrieve.bind(null, storageProfileKey);
    const retrieveTargetUrl = retrieve.bind(null, storageTargetUrlKey); // retrieveTargetUrl() instead of retrieve("fnnnauth:...")

    const setResult = function(callback, updateProfile) {
        return function(err, authResult) {
            storeAccessToken(authResult && authResult.accessToken);

            //this is removing the cached version of the profile
            //optimizing it by checking if id token exists, otherwise we don't need to call it
            if (updateProfile) {
                storeProfile(authResult && authResult.idTokenPayload);
            }

            callback(err, authResult);
        }
    }

    const createLink = function(text, className, callback) {
        const link = document.createElement("a");
        link.className = className;
        link.innerHTML = text;
        if (link.addEventListener) {
            link.addEventListener('click', callback);
        } else {
            link.attachEvent('onclick', callback);
        }
        return link;
    }

    const changePassword = function() {
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
                        err.message = err.message || err.description
                        return swal({ type: "error", title: "Uh Oh", text: err.message })
                    }
                    webAuth.changePassword({
                        connection: 'Username-Password-Authentication',
                        email: profile.email
                    }, function(err, resp) {
                        if (err) {
                            err.message = err.description
                            swal({ type: "error", title: "Uh Oh", text: err.message })
                        } else {
                            swal({ type: "success", title: "Success", text: "An email has been sent to your inbox." })
                        }
                    });
                });
            });
        })
    }

    const deleteUserProfileApi = function(callback) {
        callProfileApi("DELETE", callback);
    };

    const deleteAccount = function () {
      swal({
        title: 'Delete Account',
        text: "Are you sure you want to delete your account?",
        type: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes!',
        cancelButtonText: 'No, cancel!'
      }).then(function () {

        setTimeout(function () {
            swal.showLoading();
            getUserManagement(function (mgmt) {
              getUserProfile(function (err, profile) {
                if (err) {
                  err.message = err.message || err.description
                  return swal({ type: "error", title: "Oops!", text: err.message})
                }

                deleteUserProfileApi(function (err) {
                  if(err){
                    err.message = err.description
                    swal({ type: "error", title: "uh oh", text: err.message})
                  } else {
                    swal({ type: "success", title: "Sorry to see you go!", text: ""}).then(function () {
                        startLogout();
                    })
                  }
                });
              });
            });
        }, 1000)
        
      })
    }

    const profileHandlers = function(profile) {
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
    }

    const renderProfileFields = function(profile) {
        // Display dynamic fields in the profile, using the data-user-field attribute
        var elements = document.querySelectorAll("[data-user-field]");
        for (var i = elements.length - 1; i >= 0; i--) {
            var el = elements[i];
            var field = el.getAttribute("data-user-field");
            var value = profile[field] || profile["https://example.com/" + field]
            if (el.tagName === "IMG") {
                el.setAttribute("src", value)
            } else {
                el.textContent = value;
            }
        }
    }

    const getProfileSchema = function(profile) {
        // const EMAIL_RE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        const DATE_RE = /^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/
        return {
            type: "object",
            title: "Profile",
            properties: {
                // nickname: {
                //     title: "Display Name",
                //     type: "string",
                //     readOnly: true,
                //     default: profile["https://example.com/nickname"],
                //     "propertyOrder": 1
                // },
                first_name: {
                    title: "First Name",
                    type: "string",
                    default: "",
                    "propertyOrder": 2
                },
                email: {
                    title: "Email",
                    type: "string",
                    readOnly: true,
                    default: profile.email || "",
                    "propertyOrder": 4
                },
                //T0 DO: make the display name unique
                display_name: {
                    title: "Display Name",
                    type: "string",
                    default: "",
                    propertyOrder: 1
                },
                // newsletter_email: {
                //   title: "Newsletter Email",
                //   type: "string",
                //   default: profile.email || "",
                //   "propertyOrder": 4.1,
                //   pattern: EMAIL_RE,
                //   //required: true
                // },
                last_name: {
                    title: "Last Name",
                    type: "string",
                    default: "",
                    "propertyOrder": 3
                },
                zip_code: {
                    title: "Zip Code",
                    type: "string",
                    default: "",
                    "propertyOrder": 5.1
                },
                birthday: {
                    title: "Birthday",
                    type: "string",
                    default: "",
                    "propertyOrder": 5,
                    pattern: DATE_RE
                },
                gender: {
                    title: "Gender",
                    type: "string",
                    enum: [
                        "Not Specified",
                        "male",
                        "female"
                    ],
                    default: "Not Specified",
                    "propertyOrder": 6
                },
                party: {
                    title: "Political Views",
                    type: "string",
                    enum: [
                        "liberal",
                        "democrat",
                        "independent",
                        "republican",
                        "conservative"
                    ],
                    default: "",
                    "propertyOrder": 7
                },
                fb_breaking_alerts: {
                    type: "boolean",
                    format: "checkbox",
                    title: "Subscribe to FB Breaking Alerts",
                    default: false
                },
                fn_breaking_alerts: {
                    type: "boolean",
                    format: "checkbox",
                    title: "Subscribe to FN Breaking Alerts",
                    visible: true,
                    default: false
                },
                fn_morn_headlines: {
                    type: "boolean",
                    format: "checkbox",
                    title: "Subscribe to FN Morning Headlines",
                    default: false,
                },
                top_headline: {
                    type: "boolean",
                    format: "checkbox",
                    title: "Subscribe to Top Morning Headlines",
                    default: false
                }
            }
        }
    }

    const setupProfileEditor = function(profile) {

        

        // Get the metadata
        const metadata = profile["https://example.com/metadata"] || {};
        if (!metadata.agreed_terms) {
            startLogout();
            document.body.classList.add("hide")
            return;
        }

        // var schema = getProfileSchema(profile);
        // Object.keys(metadata).forEach(function (key) {
        //     if (!schema.properties[key]) {
        //         schema.properties[key] = {
        //             hidden: true
        //         };
        //     }
        // })
    
        // Set up the jsoneditor
        // https://github.com/jdorn/json-editor
        // var profileEditor = new JSONEditor(document.getElementById('profile-editor'), {
        //     disable_edit_json: true,
        //     disable_collapse: true,
        //     disable_properties: true,
        //     theme: 'barebones',
        //     // show_errors: "always",
        //     schema: schema
        // });



        // We make the true/false string in to a boolean
        // TODO: This is a hack
        //       If there are humans with weird names like "false" or "true", this will probably fail.
        Object.keys(metadata).forEach(function(key) {
            if (["true", "false"].includes(metadata[key])) {
                metadata[key] = metadata[key] === "true";
            }
        })


        var profileEditor = document.getElementById('profile-editor');
        console.log(profile);

        profileEditor.querySelector("[data-schemapath='root.email'] > div > input").value = profile.email;
        profileEditor.querySelector("[data-schemapath='root.first_name'] > div > input").value = metadata.first_name;
        profileEditor.querySelector("[data-schemapath='root.last_name'] > div > input").value = metadata.last_name;
        profileEditor.querySelector("[data-schemapath='root.display_name'] > div > input").value = metadata.display_name;
        profileEditor.querySelector("[data-schemapath='root.party'] > div > select").value = metadata.party;
        profileEditor.querySelector("[data-schemapath='root.gender'] > div > select").value = metadata.gender;
        profileEditor.querySelector("[data-schemapath='root.zip_code'] > div > input").value = metadata.zip_code;


        // // Set the default fields
        // Object.keys(profileEditor.schema.properties).forEach(function(cProp) {
        //     var sch = profileEditor.schema.properties[cProp];
        //     var def = sch.default
        //     if (sch.hidden) {
        //         document.querySelector("[data-schemapath=\"root." + cProp + "\"]").style.display = "none"
        //     }
        //     if (def !== undefined && metadata[cProp] === undefined) {
        //         metadata[cProp] = def;
        //     }
        // })

        // //style the user form 
        // const lineUserProfile = `<div class='hr'></div>`;
        // const stylingNewsletterUserProfile = `<div><h3>Newsletter Subscriptions</h3>${lineUserProfile}</div>`;

        // //TODO: make this append once only
        // $('h3 span').append(lineUserProfile);
        // $('div[data-schemapath="root.party"]').append(stylingNewsletterUserProfile);


        // profileEditor.setValue(metadata);

        // Save the metadata, when we click on the save button
        document.querySelector("#save-profile").addEventListener("click", function() {

            var errors = profileEditor.validate()
            var errorsContainer = document.querySelector("#errors")
            errorsContainer.innerHTML = "";
            if (errors.length) {
                errors.forEach(function(err) {
                    // if (err.path === "root.newsletter_email") {
                    // err.message = "Invalid newsletter email";
                    // }
                    if (err.path === "root.birthday") {
                        err.message = "Invalid Birthday - Must be in the format 'YYYY-MM-DD'";
                    }
                    err.elm = document.createElement("div")
                    err.elm.textContent = err.message;
                    err.elm.setAttribute("class", "error");
                    errorsContainer.appendChild(err.elm);
                })

                return;
            }
            swal.showLoading()

            var value = profileEditor.getValue()

            // Delete the disabled fields from the value
            //deleting read only fields from the object sent to auth 0
            Object.keys(profileEditor.schema.properties).forEach(function(cProp) {
                if (profileEditor.schema.properties[cProp].readOnly) {
                    delete value[cProp]
                }
            })

            //if (value....) {
            // update newsletter preferences
            // value.fn_subscribe...
            //}
            setUserMetadata(value, function(err) {
                if (err) {
                    return showError(err);
                }
                swal({ type: "success", title: "Saved!" });
            })
        });
    }

    const renderUserInfo = function() {
        getUserProfile(function(err, profile) {
            if (err) {
                console.error("Error retrieving the user profile", err);
                return;
            }

            profileHandlers(profile)
            renderProfileFields(profile)
            setupProfileEditor(profile);
        });
    }

    const createWebAuth = function() {
        webAuth = webAuth || new auth0.WebAuth(options.default);
        return webAuth;
   }

    const loadAuth0js = function(callback) {
        if (!root.auth0) {
            loadJs(auth0jslocation, function () {
                callback(createWebAuth());
        });
        } else {
            callback(createWebAuth());
        }
    }

    const getWebAuth = function(callback) {
        loadAuth0js(function() {
            //options.default.audience = "https://sso.foxnews.com/userinfo"
            webAuth = webAuth || new root.auth0.WebAuth(options.default);
            callback(webAuth);
        });
    }

    const silentLogin = function(callback) {

        // Renew auth (basically, login)
        getWebAuth(function(webAuth) {
            webAuth.renewAuth(options.silent, setResult(callback));
        });
    }


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


    const auth0Logout = window.auth0logout = function(cb) {
        getWebAuth(function(webAuth) {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = webAuth.client.buildLogoutUrl();
            iframe.onload = iframe.onerror = cb;
            document.body.appendChild(iframe);
/*
            setTimeout(function() {
                document.body.removeChild(iframe);
            }, 1500);*/
        });
    }

    const startLogout = function(e) {
        if (e) e.preventDefault();

        // Empty the storage data (by not passing anything)
        storeAccessToken();
        storeProfile();
        swal.showLoading();
        auth0Logout(function() {
            location.reload();
        })
    }

    const startLogin = function(e) {
        if (e) e.preventDefault();

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
    }

    const authnCallback = function(err, authResult) {
        if (err || !authResult || !authResult.accessToken) {
            console.log("Unsuccessful attempt to login", err, authResult);
        } else {
            console.log("Login completed successfully");
            renderUserInfo();
        }
        setAuthAttributeInBody();
    }

    const getUserProfile = function(callback, useSilentLogin) {
        if (!isAuthenticated()) return callback(new Error("The user has to login to get the profile"));
        useSilentLogin = useSilentLogin !== false;

        // Try to get it from the storage
        const profile = retrieveProfile();

        // If it's cached in the storage, we stop here and callback
        if (profile) return callback(null, profile);

        //retrieve from Auth0
        const token = retrieveAccessToken();

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
    }

    const getUserManagement = function(cb) {
        silentLogin(setResult(function(err, authResult) {
            loadAuth0js(function() {
                const mgmt = new root.auth0.Management({
                    domain: options.default.domain,
                    token: authResult.idToken
                });
                cb(mgmt)
            });
        }));
    }

    const setUserProfile = window.setUserProfile = function (profile, callback) {
        callProfileApi("PATCH", profile, function(err, data) {
            if (err) return callback(err);
            // we get a new token to get the updated profile
            silentLogin(setResult(function() {
                 getUserProfile(callback);
            }, true));
        });
    }

    // Use the management constructor to patch the user metadata
    // and store the the updated profile in the storage
    const setUserMetadata = function(profile, callback) {
        if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

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

        setUserProfile({user_metadata:profile}, callback)
    }

    const isAuthenticated = function() {
        return !!retrieveAccessToken();
    }

    const login = function(callback) {
        if (isAuthenticated()) {
            getUserProfile(callback);
        } else {
            silentogin(function(err, authResult) {
                if (err) return callback(err);

                if (isAuthenticated()) {
                    getUserProfile(callback, false);
                } else {
                    startLogin();
                }
            });
        }
    }

    const initialize = function(profileElSel, loginElSel) {

        // Get elements from the DOM, based on the ids
        profileElement = document.getElementById(profileElSel)
        loginElement = document.getElementById(loginElSel)

        // Create the login/logout buttons
        loginElement.appendChild(createLink("Login", "fnnauth0-login", startLogin));
        document.getElementById("change-pass").parentElement.insertBefore(createLink("Log Out", "fnnauth0-logout", startLogout), document.getElementById("change-pass"));

        // Set auth state in the body element
        setAuthAttributeInBody();

        // Eventually render the user info, if authenticated. Otherwise, the login view
        if (isAuthenticated()) {
            renderUserInfo();
        } else {
            silentLogin(authnCallback);
        }
    }

    // Class Constructor
    const FNNAuth = function(domainName, useRedirect) {
        domain = domainName || root.location.hostname;
        redirect = useRedirect!==false ;
        options = getDomainOptions(domain);
    };

    // Methods
    FNNAuth.prototype.initialize = initialize;
    FNNAuth.prototype.login = login;
    FNNAuth.prototype.isAuthenticated = isAuthenticated;
    FNNAuth.prototype.getUserProfile = getUserProfile;
    FNNAuth.prototype.setUserMetadata = setUserMetadata;

    const staticInitialize = function(profileElement, loginElement, domain, redirect) {
        const instance = new FNNAuth(domain, redirect);
        instance.initialize(profileElement, loginElement);
    };

    // Question:
    // Why camelCase by default ONLY on login? Not on the other routes.

    // After login (called from callback.html)
    const handleCallback = function(domain) {
        options = getDomainOptions(domain || root.location.hostname);
        getWebAuth(function(webAuth) {
          webAuth.parseHash(setResult(function(err, authResult) {
            if (err) { return showError(err) }
            var redirectUser = function () {
                const redirect = retrieveTargetUrl() || root.location.origin;
                storeTargetUrl();
                root.location.href = redirect;
            }
            getUserProfile(function(err, profile) {
                if (err) { return showError(err) }
                var metadata = profile["https://example.com/metadata"];
                if (metadata.agreed_terms) {
                    return redirectUser()
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
                document.querySelector("form.new-user").addEventListener("submit", function (e) {
                    e.preventDefault()
                    swal.showLoading();
                    
                    metadata.newsletters = {};
                    metadata.agreed_terms = document.querySelector("#checkboxTerms").checked;
                    metadata.first_name = firstName.value;
                    metadata.last_name = lastName.value;
                    metadata.display_name = displayName.value;
                    metadata.birthday = birthday.value;
                    metadata.fb_breaking_alerts = document.querySelector("#fb_breaking_alerts").checked;
                    metadata.fn_breaking_alerts = document.querySelector("#fn_breaking_alerts").checked;
                    metadata.fn_morn_headlines = document.querySelector("#fn_morn_headlines").checked;
                    metadata.top_headline = document.querySelector("#top_headline").checked;
                    metadata.gender = gender.value;
                    metadata.party = party.value;
                    setUserMetadata(metadata, function (err) {
                        if (err) {
                            return showError(err);
                        }
                        redirectUser();    
                    })
                })
            });
            
          }));
        });
    }

    // index.html             fnnauth.js
    // FNNAuth.initialize --> staticInitialize --> new FnnAuth().initialize

    //called in the html
    FNNAuth.initialize = staticInitialize;
    FNNAuth.handleCallback = handleCallback;
    FNNAuth.showError = showError

    //making it global 
    root.FNNAuth = FNNAuth;
})(window)



//TO DO: make UI using vue.js
//Goal: silent login, browser compatible, newsletter integration, spot im integration, editing profile

//QUESTION: How to delete user?
//QUESTION: How to edit fields outside of user_metadata

//QUESTION: request.open('GET', '/authn/' + domain + ".json", false); --need to publish domain configs
//TO DO: how to add validators for user metadata --use webtasks
//TO DO: Newsletter email validator
//TO DO: prompt user to fill newsletter email field if empty
//TO DO: can you add a date field to the sign up form
//TO DO: make pop up embeddable
//T0 DO: validate metadata currently using rule in js before sending back to auth 0
//TO DO: fix appended formatting by clearing user profile div
//TO DO: update metadata for social sign in profile
//T0 DO: edit placeholder text for login.
//TO DO: add conditional for social login to not be able to change password
//TO DO: make username unique
//TO DO: Make callback url permissions link dynamic
//TO DO: linking users
//TO DO: connect newsletter 
//TO DO: add 'rules'
//TO DO: connect with spot IM commenting
//TO DO: have a file where we can save revision for login form
//TO DO: way to easily migrate users
//TO DO: clean up hosted login page on dashboard
//TO DO: add official logo