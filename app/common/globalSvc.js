(function (app) {
  "use strict";
  app.factory("GlobalSvc", ["$http", function ($http) {
    return {
      Get: function (url, data) {
        $http({
          url: url,
          method: "get",
          type: "json",
          data: data,
        }).then(function (res) {
          return res;
        });
      },
      Post: function (url, data) {
        $http({
          url: url,
          method: "post",
          type: "json",
          data: data,
        }).then(function (res) {
          return res;
        });
      }
    }
  }]);
})(angular.module("app"));