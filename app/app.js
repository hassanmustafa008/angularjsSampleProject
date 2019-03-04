(function () {
  "use strict";
  angular.module("custom.Directives", []);
  angular.module("app", ["ngRoute", "custom.Directives"]);

  angular.module("app").controller("TestCtrl", ["$scope", "GlobalSvc", function ($scope, globalSvc) {
    // $scope.shared = "test1";
    // $scope.isolate = "test1";
    // $scope.inherited = "test1";
    $scope.alertMe = function (text) {
      debugger
      alert("Hi, I am from controller with child directive text " + text);
    };
    // globalSvc.Get("list").then(function () {
    //   debugger
    // }).catch(function () {
    //   debugger
    // });
  }]);
})();