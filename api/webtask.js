'use latest';

import validator from 'validator';
import express from 'express';
import { json as jsonParser } from 'body-parser';
import { middlewares } from 'auth0-extension-express-tools';
import { createServer } from 'auth0-extension-express-tools';

const pipeException = (err, res) => {
  res.status(err.statusCode).json(err).end();
};

const deleteUser = (req,res) => {
  req.auth0.users.delete({id: req.user.sub })
    .then(() => {
      res.status(204).json({}).end();
    })
    .catch((err) => {
      pipeException(err,res);
    });
};

const updateUser =  (req, res) => {
  const profile = req.body;
  
  if (profile.password) {
    return res.status(400).json({statusCode:400, name:"invalid_body", message: "Invalid element password. Use the Change Password functionality"}).end();
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
    return res.status(400).json({statusCode:400, name:"invalid_body", message: "Email newsletter is not a valid email"}).end();
  }
  
  // TODO: Newsletter API could also be updated at this point if needed

  req.auth0.users.update({id: req.user.sub}, profile)
    .then(data => {
      // The raw profile will not match the one used by the application
      // either map (duplicate of rule) or let the client to ask for a refreshed profile
      res.status(204).end();
    })
    .catch(err => {
      if (err.statusCode === 400) {
        // this means that the body was invalid if possible try to provide a better message
        pipeException(err,res);
      } else {
        pipeException(err,res);
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