function(user, context, callback) {
  context.accessToken.scope = ['user_metadata'];
  callback(null, user, context);
}