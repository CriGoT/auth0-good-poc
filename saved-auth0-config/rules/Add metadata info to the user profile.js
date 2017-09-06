function (user, context, callback) {

  var namespace = "https://example.com/";

  if (context.request.geoip) {
    context.idToken[namespace + "country"] = context.request.geoip.country_name;
    context.idToken[namespace + "timezone"] = context.request.geoip.time_zone;
  }
       
  // Twitter bigger image
  switch (context.connectionStrategy) {
    case "facebook":
      user.picture = user.picture_large;
      break;
  }
  
  context.idToken[namespace + "user_id"] = user.identities[0].user_id;
  context.idToken[namespace + "email"] = user.email;
  var metadata = context.idToken[namespace + "metadata"] = user.user_metadata || {};
  context.idToken[namespace + "nickname"] = user.nickname;
  context.idToken[namespace + "picture"] = user.picture;
  context.idToken[namespace + "display_name"] = metadata.display_name || (user.name && user.name.split("@")[0]) || user.nickname;

  //context.idToken["foo"] = "bar";
   // Example geoip object:
   // "geoip": {
   //    "country_code": "AR",
   //    "country_code3": "ARG",
   //    "country_name": "Argentina",
   //    "region": "05",
   //    "city": "Cordoba",
   //    "latitude": -31.41349983215332,
   //    "longitude": -64.18109893798828,
   //    "continent_code": "SA",
   //    "time_zone": "America/Argentina/Cordoba"
   //  }

  callback(null, user, context);
}