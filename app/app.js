(function () {
  "use strict";
  angular.module("app", ["ngRoute", "directives", "components"]);

  angular.module("app").config(function ($routeProvider) {
    $routeProvider
      .when("/directives", {
        templateUrl: "app/modules/directivesModules/directivesScope/customDirectives.html",
        controller: "directivesCtrl"
      })
      .when("/components", {
        templateUrl: "app/modules/componentsModule/components/components.html",
        controller: "componentsCtrl"
      })
      .otherwise({
        redirectTo: '/directives'
      });
  }).controller("appCtrl", ["$scope", "GlobalSvc", function ($scope, globalSvc) {
    // $scope.shared = "test1";
    // $scope.isolate = "test1";
    // $scope.inherited = "test1";
    $scope.alertMe = function () {
      alert("Hi, I am from controller with child directive text " + $scope.shared || $scope.inherited);
    };
    $scope.shareFun = function (directive) {
      alert("Hi, I am called from " + (directive ? "directive." : "controller."));
    };
    // globalSvc.Get("list").then(function () {
    //   debugger
    // }).catch(function () {
    //   debugger
    // });
  }]);
})();