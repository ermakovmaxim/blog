(function() {

  // require linkClicked

  linkClicked(function(event) {
    var socialNetwork = this.getAttribute('data-social-network');
    if (socialNetwork) {
      var socialAction = this.getAttribute('data-social-action');
      var socialTarget = 'http://philipwalton.com'
          + this.getAttribute('data-social-target');

      ga('send', 'social', socialNetwork, socialAction, socialTarget, {
        // `nonInteracdtion` prevents this event from affecting bounce rate.
        // https://developers.google.com/analytics/devguides/collection/analyticsjs/events
        'nonInteraction': 1
      });
    }
  });

}());