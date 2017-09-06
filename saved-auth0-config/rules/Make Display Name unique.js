function (user, context, callback) {
  var request = require('request@2.56.0');

  var userApiUrl = auth0.baseUrl + '/users';

  request({
   url: userApiUrl,
   headers: {
     Authorization: 'Bearer ' + auth0.accessToken
   },
   qs: {
     search_engine: 'v2',
     q: 'display_name:' + user.user_metadata.display_name,
   }
  },
  function(err, response, body) {
    if (err) return callback(err);
    if (response.statusCode !== 200) return callback(new Error(body));

    var data = JSON.parse(body);
    if (data.length > 0) {
      console.log("data: " + data);
    } else {
      callback(null, user, context);
    }
  });
}