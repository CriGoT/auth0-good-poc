(function(root) {
  const storagePrefix = "fnnauth:";
  const storageTokenKey = storagePrefix + "accessToken";
  const storageProfileKey = storagePrefix + "profile";
  const storageTargetUrlKey = storagePrefix + "targetUrl";

  const storage = root.sessionStorage;
  const document = root.document;
  const auth0jslocation = "http://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";

  if (!root.FNNAuth) {
    var domain;
    var containerElement;
    var webAuth;
    var initialized;
    var options;
  
    const setAuthAttributeInBody = function () {
      document.body.setAttribute("data-auth", isAuthenticated().toString())
    }

    const isElement = function(e) {
      return typeof HTMLElement === "object" ? e instanceof HTMLElement : e && typeof e === "object" && e.nodeType === 1 && typeof e.nodeName==="string";
    }

    const getDomainOptions = function(domain) {
      if (!options) {
        // Options are retrieved synchronously to provide feedback to the instance creator
        try {
          const request = new XMLHttpRequest();
          request.open('GET', domain + ".json", false);  // Decide where to publish domain configs
          request.send(null);

          if (request.status === 200) {
            options = JSON.parse(request.responseText);
          }
        } catch(e) {
          console.error("An error ocurred while retrieving the domain authentication configuration", e);
        }
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
      if (value!==undefined) {
        storage.setItem(key, JSON.stringify(value));
      } else {
        storage.removeItem(key);
      }
    }

    const retrieve = function(key) {
      return JSON.parse(storage.getItem(key));
    }

    //binding the value to 'this' & adding it or retrieving it from storage 
    const storeAccessToken = store.bind(null,storageTokenKey);
    const storeProfile = store.bind(null,storageProfileKey);
    const storeTargetUrl = store.bind(null,storageTargetUrlKey);
    const retrieveAccessToken = retrieve.bind(null,storageTokenKey);
    const retrieveProfile = retrieve.bind(null,storageProfileKey);
    const retrieveTargetUrl = retrieve.bind(null,storageTargetUrlKey);

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

    const renderUserInfo=function(){
      getUserProfile(function (err, profile) {
        if (err) {
          console.error("Error retrieving the user profile", err);
          return renderLoginBox();
        }



        document.getElementById("change-pass").addEventListener("click", function () {
        swal({
          title: 'Really? :D',
          text: "Do you really want to change your password?",
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes!',
          cancelButtonText: 'No, cancel!'
        }).then(function () {
          swal.showLoading();
          getWebAuth(function (webAuth){
            webAuth.changePassword({
              connection: 'Username-Password-Authentication',
              email: profile.email
            }, function (err, resp) {
              if(err){
                err.message = err.description
                swal({ type: "error", title: "Whoups!", text: err.message})
              }else{
                swal({ type: "success", title: "Yay!", text: "Check your inbox."})
              }
            });
          });
        })
        
      })

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

        var profileEditor = new JSONEditor(document.getElementById('profile-editor'), {
          disable_edit_json: true,
          disable_collapse: true,
          disable_properties: true,
          schema: {
            type: "object",
            title: "Your Profile: @" + profile["https://example.com/nickname"],
            properties: {
              display_name: {
                title: "Display Name",
                type: "string"
              },
              birthday: {
                title: "Birthday",
                type: "string"
              },
              party: {
                title: "Party",
                type: "string",
                enum: [
                  "liberal",
                  "democrat",
                  "independent",
                  "republican",
                  "conservative"
                ]
              },
              fb_breaking_alerts: {
                type: "boolean",
                format: "checkbox",
                title: "Subscribe to FB Breaking Alerts"
              },
              fn_breaking_alerts: {
                type: "boolean",
                format: "checkbox",
                title: "Subscribe to FN Breaking Alerts"
              },
              fn_morn_headlines: {
                type: "boolean",
                format: "checkbox",
                title: "Subscribe to FN Morning Headlines"
              },
              top_headline: {
                type: "boolean",
                format: "checkbox",
                title: "Subscribe to Top Morning Headlines"
              }
            }
          }
        });
        const metadata = profile["https://example.com/metadata"];
        //we make the true/false string in to a boolean
        Object.keys(metadata).forEach(function (key) {
            if (["true", "false"].includes(metadata[key])) {
              metadata[key] = metadata[key] === "true";
            }
        })

        metadata.display_name = metadata.display_name || "";
        metadata.birthday = metadata.birthday || "";
        profileEditor.setValue(metadata);
        document.querySelector("#save-profile").addEventListener("click", function () {
          swal.showLoading()
          setUserProfile(profileEditor.getValue(), function () {
            swal({ type: "success", title: "Saved!"});
          })
        });
        
      });
    }

    const renderLoginBox = function() {
      //containerElement.innerHTML="";

      //containerElement.appendChild();
    }

    const loadAuth0js = function(callback) {
      if (!root.auth0) {
        loadJs(auth0jslocation,callback);
      } else {
        callback();
      }
    }

    const getWebAuth = function(callback) {
      loadAuth0js(function() {
        webAuth = webAuth || new root.auth0.WebAuth(options.default);
        callback(webAuth);
      });
    }

    const silentLogin = function(callback) {
      if (!initialized) throw new Error('You have to initialize the instance before trying to use it');

      getWebAuth(function (webAuth){
        webAuth.renewAuth(options.silent, setResult(callback));
      });
    }

    const auth0Logout = function(cb) {
      getWebAuth(function (webAuth) {
        const iframe = document.createElement("iframe");
        iframe.style.display="none";
        iframe.src= webAuth.client.buildLogoutUrl();
        iframe.onload = cb;
        document.body.appendChild(iframe);
        setTimeout(function() {
          document.body.removeChild(iframe);
        }, 1500);
      });
    }

    const startLogout =function(e) {
      if (e) e.preventDefault();
      storeAccessToken();
      storeProfile();
      swal.showLoading();
      auth0Logout(function () {
        location.reload();
      })
      //renderLoginBox();
      //setTimeout(auth0Logout,50);
    }

    const startLogin = function(e) {
      if (e) e.preventDefault();

      storeTargetUrl(window.location.href);
      getWebAuth(function(webAuth){
        // QUESTION: options.popup.ignoreCasing = true
// Alice True
// First: Alice
// Last: [x] 

// Question: storing boolean values, without converting into strings?
//           subscribed: false instead of "false"
        webAuth.popup.authorize(options.popup, setResult(authnCallback));
      });
    }

    const authnCallback = function(err, authResult) {
      if (err || !authResult || !authResult.accessToken) {
        console.log("Unsuccessful attempt to login", err, authResult);
        renderLoginBox();
      } else {
        console.log("Login completed successfully");
        renderUserInfo();
      }
      setAuthAttributeInBody();
    }

    const getUserProfile = function(callback, useSilentLogin) {
      if (!isAuthenticated()) return callback(new Error("The user has to login to get the profile"));
      useSilentLogin = useSilentLogin !==false;

      const profile = retrieveProfile();
      if (profile) return callback(null, profile);

      //retrieve from Auth0
      const token = retrieveAccessToken();
      getWebAuth(function(webAuth) {
        webAuth.client.userInfo(token, function(err, user) {
          console.log(user);
          if (err) {
            if (useSilentLogin) {
              //Most likely access token has expired try silent login to renew
              silentLogin(getUserProfile.bind(null, callback, false));
            } else {
             return callback (err);
            }
          }
          storeProfile(user);
          callback(null, user);
        });
      });
    }

    const mapProfile = function(profile) {
      return profile
    };

    const setUserProfile= function(profile, callback) {
      if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

      silentLogin(setResult(function(err, authResult) {
        if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));
        loadAuth0js(function() {

          const mgmt = new root.auth0.Management({
            domain: options.default.domain,
            token: authResult.idToken
          });

          mgmt.patchUserMetadata(authResult.idTokenPayload.sub, mapProfile(profile), function(err, user) {
            if (err) return callback(err);
            // we get a new token to get the updated profile
            silentLogin(setResult(function(){
              getUserProfile(callback);
            }, true));
          });
        });
      }));
    }

    const isAuthenticated = function() {
      return !!retrieveAccessToken();
    }

    const login = function(callback) {
      if (isAuthenticated()) {
        getUserProfile(callback);
      } else {
        silentogin(function (err, authResult) {
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
      if (initialized) throw new Error("The instance is already initialized");
      
      initialized = true;

      
      profileElement = document.getElementById(profileElSel)
      loginElement = document.getElementById(loginElSel)

      loginElement.appendChild(createLink("Login","fnnauth0-login",startLogin));
      profileElement.appendChild(createLink("Logout","fnnauth0-logout",startLogout));
      
      setAuthAttributeInBody();
      if (isAuthenticated()) {
        renderUserInfo();
      } else {
        silentLogin(authnCallback);
      }
    }
    
    const FNNAuth = function(domainName) {
      domain = domainName || root.location.hostname;
      initiialized = false;
      options = getDomainOptions(domain);
    }

    FNNAuth.prototype.initialize = initialize;
    FNNAuth.prototype.login = login;
    FNNAuth.prototype.isAuthenticated = isAuthenticated;
    FNNAuth.prototype.getUserProfile = getUserProfile;
    FNNAuth.prototype.setUserProfile = setUserProfile;

    const staticInitialize = function(profileElement, loginElement, domain) {
      const instance = new FNNAuth(domain);
      instance.initialize(profileElement, loginElement);
    }

    const handleCallback = function(domain){
      options = getDomainOptions(domain || root.location.hostname);
      getWebAuth(function (webAuth){
          webAuth.popup.callback();
          setTimeout(root.close,500);
      });
    }

    FNNAuth.initialize = staticInitialize;
    FNNAuth.handleCallback = handleCallback;

    root.FNNAuth = FNNAuth;
  }
})(window)



    // www.foxnews.com/portal/newsalertsubscribe
    // $.ajax({
    //     type: "POST",
    //     url: "/portal/newsalertsubscribe",
    //     data: ({ slids: SLID, email: email, format: "html" }),
    //     dataType: "text"
    // }).done(function() {
    //     ISA.track({ "email-sign-up-success": { listName: list } });
    // });



    //TO DO: make UI using vue.js
    //Goal: silent login, browser compatible, newsletter integration, spot im integration, editing profile


    //QUESTION: How to edit fields outside of user_metadata
    //QUESTION: request.open('GET', '/authn/' + domain + ".json", false); --need to publish domain configs
    //TO DO: make pop up embeddable
    //TO DO: Make callback url permissions link dynamic
    //TO DO: allow users to edit their profile
    //TO DO: linking users
    //TO DO: user profiles
    //TO DO: connect newsletter 
    //TO DO: add 'rules'
    //TO DO: add links to the terms & conditions
    //TO DO: connect with spot IM commenting
    //TO DO: have a file where we can save revision for login form
    //TO DO: way to easily migrate users
    //TO DO: clean up hosted login page on dashboard
    //TO DO: add official logo


    //link to user profile currently: http://www.foxnews.com/community/user/profile/edit

//REWRITES FOR USER PROFILE & LOGIN PAGES REFERENCE
// http://jira.nyc.foxnews.com/browse/FOX-30091?focusedCommentId=391096&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-391096

// The edit profile page for the currently logged in user 
// Public: http://www.foxnews.com/community/user/profile/edit 
// Origin: foxnews.com/static/v/all/html/edit-profile.html

// The full profile activity page for a user (Origin file not yet on server) 
// Public: [uuid]" class="external-link">http://www.foxnews.com/community/user/profile/[uuid] 
// Origin: foxnews.com/static/v/all/html/profile-activity.html

// Landing page for password reset 
// Public: http://www.foxnews.com/community/user/password-reset 
// Origin: foxnews.com/static/v/all/html/password-reset.html

// Landing page for verify email 
// Public: http://www.foxnews.com/community/user/verify-email 
// Origin: foxnews.com/static/v/all/html/email-verification.html

