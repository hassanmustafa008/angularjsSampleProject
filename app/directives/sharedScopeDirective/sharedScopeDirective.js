"use strict";
angular.module("app").directive("sharedScopeDirective", ["$log", function ($log) {
  return {
    templateUrl: "app/directives/sharedScopeDirective/sharedScopeDirective.html",
    restrict: 'E',
    link: function () {
      console.log("Shared");
    },
    controller: function ($scope) {
      console.log($scope);
    }
  }
}]);
