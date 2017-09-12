'use latest';

import validator from 'validator';
import express from 'express';
import { json as jsonParser } from 'body-parser';
import { middlewares } from 'auth0-extension-express-tools';
import { createServer } from 'auth0-extension-express-tools';
import request from 'tinyreq';
import qs from "querystring";

const pipeException = (err, res) => {
    res.status(err.statusCode || 400).json({
        message: err.message
    }).end();
};

const deleteUser = (req, res) => {
    req.auth0.users.delete({ id: req.user.sub })
        .then(() => {
            res.status(204).json({}).end();
        })
        .catch((err) => {
            pipeException(err, res);
});
};

const updateUser = (req, res) => {
        const profile = req.body;

        if (profile.password) {
            return res.status(400).json({ statusCode: 400, name: "invalid_body", message: "Invalid element password. Use the Change Password functionality" }).end();
        }

        // TODO: map profile if needed

        // Remove properties we don't allow the user to update
        delete profile.email_verified;
        delete profile.phone_verified;
        delete profile.password;
        delete profile.verify_email;
        delete profile.blocked;
        delete profile.app_metadata;

        // TODO: validate profile
        profile.user_metadata = profile.user_metadata || {};
        if (profile.user_metadata.email_newsletter && !validator.isEmail(profile.user_metadata.email_newsletter)) {
        // Ideally group all errors together
        return res.status(400).json({ statusCode: 400, name: "invalid_body", message: "Email newsletter is not a valid email" }).end();
    }

    // TODO: Newsletter API could also be updated at this point if needed

    const hasSymbols = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

    Promise.resolve().then(() => {

        // Display name validation (no symbols or white space)
        const displayName = profile.user_metadata.display_name;
        if (hasSymbols.test(displayName)) {
            throw new Error("Invalid display name. No spaces or symbols.")
        } else if (displayName.length > 15) {
          throw new Error("Invalid display name. Cannot be longer than 15 characters.")
        }
        // Agreed terms
        const agreed = profile.user_metadata.agreed_terms = !!profile.user_metadata.agreed_terms;
        if (!agreed) {
            throw new Error("You have to agree to the terms...")
        }
        // Birthday
        const birthday = profile.user_metadata.birthday
        var isInvalidBirthday = (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
            isNaN(new Date(birthday).getTime())
        );
        if (isInvalidBirthday) {
            throw new Error("Enter a valid birthday date.");
        }
    }).then(() => {
        const query = `user_metadata.display_name:"${profile.user_metadata.display_name}" -user_id:"${req.user.sub}"`;

        return req.auth0.users.getAll({
            q: query
        })
    }).then(users => {
        //check that display name unique
        console.log(users)
        if (users.length) {
            throw new Error("The display name is already used.")
        }
    }).then(() => {
        return req.auth0.users.get({ id: req.user.sub })
    }).then(currentUser => {
        req.currentUser = currentUser
        return req.auth0.users.update({ id: req.user.sub }, profile)
    }).then(() => {
        const email = req.currentUser.email

        const oldMetadata = req.currentUser.user_metadata || {}
        const metadata = profile.user_metadata || {}

        
        const newsletters = metadata.newsletters || {};
        const oldNewsletters = oldMetadata.newsletters || {};

        const possibleNewsletters = {
            "fb_breaking_alerts": {
                slid: "5C84B893BD6D939E84FAE1A8E6E9525A",
                group: "foxbusiness",
                list_id: "32"
            },
            "fn_breaking_alerts": {
                slid: "C2F278094FACCEA62391025B7A52D8EB",
                group: "foxnews",
                list_id: "35"
            },
            "fn_morn_headlines": {
                slid: "3DC725E303A24F8DCF015F07C61BABFD",
                group: "foxnewsletter",
                list_id: "144"
            },
            "top_headline": {
                slid: "3DC725E303A24F8DB05092D232355E43",
                group: "foxnewsletter",
                list_id: "71"
            }
        }

        const slids = {
            subscribe: [],
            unsubscribe: []
        }

        Object.keys(possibleNewsletters).forEach(newsletterName => {
            const slid = possibleNewsletters[newsletterName]

            const subscribedBefore = oldNewsletters[newsletterName]
            const subscribedNow = newsletters[newsletterName]

            const isUnsubscribing = subscribedBefore && !subscribedNow
            const isSubscribing = !subscribedBefore && subscribedNow

            // unsubscribe
            if (isUnsubscribing) {
                slids.unsubscribe.push(slid)
                // subscribe
            } else if (isSubscribing) {
                slids.subscribe.push(slid)
            }
        })

        const promises = []

        if (slids.subscribe.length) {
            promises.push(request({
                url: "http://www.foxnews.com/portal/newsalertsubscribe",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: {
                    email,
                    slids: slids.subscribe.map(c => c.slid).join(",")
                }
            }).then(res => {
                console.log(res)
            }))
        }
        //since unsubscribe accepts one slid at a time, we need to request individually
        if (slids.unsubscribe.length) {
            const queries = slids.unsubscribe.map(c => ({
                c: "unsub",
                email,
                list_id: c.list_id,
                r: c.group
            }));
            promises.push(Promise.all(queries.map(query => request(
                `http://www.foxnews.com/feeds/app/newsletters/?${qs.stringify(query)}`
            ).then(res => {
                console.log(res);
            }))));
        }

        return Promise.all(promises);
    }).then(() => {
        // The raw profile will not match the one used by the application
        // either map (duplicate of rule) or let the client ask for a refreshed profile
        res.status(204).end();
    }).catch(err => {
        if (err.statusCode === 400) {
            // this means that the body was invalid if possible try to provide a better message
            pipeException(err, res);
        } else {
            pipeException(err, res);
        }
    })
};


const createApi = (config, storage) => {
    const api = express();
    api.use(middlewares.authenticateUsers({
        domain: config('AUTH0_DOMAIN'),
        audience: config('API_AUDIENCE'),
        credentialsRequired: false
    }));
    api.use(middlewares.managementApiClient({
        domain: config('AUTH0_DOMAIN'),
        clientId: config('AUTH0_CLIENT_ID'),
        clientSecret: config('AUTH0_CLIENT_SECRET')
    }));
    api.use(jsonParser());

    api.patch('/', updateUser);
    api.delete('/', deleteUser);

    return api;
};

module.exports = createServer(createApi);