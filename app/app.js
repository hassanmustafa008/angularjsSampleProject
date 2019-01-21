(function () {
  "use strict";
  angular.module("custom.Directives", []);
  angular.module("app", ["ngRoute", "custom.Directives"]);

  angular.module("app").controller("TestCtrl", ["$scope", "GlobalSvc", function ($scope, globalSvc) {
    debugger;
    // globalSvc.Get("list").then(function () {
    //   debugger
    // }).catch(function () {
    //   debugger
    // });
  }]);
})();