function (user, context, callback) {
  var audience = (context.request.query.audience || context.request.body.audience);
  console.log(audience);
  if (audience === "https://sso.foxnews.com/userinfo" && !context.clientMetadata.ProfilePage) {
    return callback(new UnauthorizedError('Access Denied'));
  }
  callback(null, user, context);
}