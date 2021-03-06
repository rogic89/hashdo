/* global card, locals, baseUrl */

card.analytics = {

};

card.analytics.record = function (events, callback) {
  if (events) {
    $.post(baseUrl + '/api/card/analytics',
      {
        cardKey: locals.card.key,
        apiKey: locals.card.apiKey,
        pack: locals.card.pack,
        card: locals.card.name,
        events: JSON.stringify(events)
      },
      function (response) {
        if (response.error) {
          callback && callback(response.message);
        }
        else {
          callback && callback();
        }
      }
    );
  }
  else {
    callback && callback();
  }
};
