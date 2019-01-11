(function () {
  "use strict";
  angular.module("app", [])
    .config([function () {

    }])
    .run([function () {

    }]);
  angular.module("app").controller("TestCtrl", ["$scope", "GlobalSvc", function ($scope, globalSvc) {
    debugger;
    // globalSvc.Get("list").then(function () {
    //   debugger
    // }).catch(function () {
    //   debugger
    // });
  }]);
})();