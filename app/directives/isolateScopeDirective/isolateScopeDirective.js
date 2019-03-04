"use strict";
angular.module("app").directive("isolateScopeDirective", ["$log", function ($log) {
  return {
    templateUrl: "app/directives/isolateScopeDirective/isolateScopeDirective.html",
    restrict: 'E',
    scope: {},
    link: function () {
      console.log("Isolate");
    },
    controller: function ($scope) {
      console.log($scope);
    }
  }
}]);
