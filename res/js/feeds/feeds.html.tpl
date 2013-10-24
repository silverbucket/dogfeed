<h4 ng-transclude></h4>
<ul class="nav nav-list nav-pills nav-stacked">
  <li ng-click="switchFeed()" ng-class="{active: isSelected(), 'all-feeds': true}">
      <span class="glyphicon glyphicon-globe"></span> <span>All Items</span>
  </li>
  <li ng-show="feeds.infoArray.length == 0"><span>no feeds yet, add some!</span></li>
  <li ng-repeat="f in feeds.infoArray | orderBy: 'name'"
      data-toggle="tooltip"
      ng-init="showSettings = false"
      ng-mouseover="showSettings = true"
      ng-mouseleave="showSettings = false"
      title="{{ f.url }}"
      ng-click="switchFeed(f.url, f.error)"
      ng-class="{'feed-entry': true, active: isSelected(f.url), error: f.error, loading: !f.loaded}">
    <span ng-click="showFeedSettings(f.url)"
          ng-class="{glyphicon: f.loaded, 'glyphicon-cog': (f.loaded || f.error) && showSettings, settings: true, 'icon-loading-small': !f.loaded}"></span>
    <span class="unread-count" ng-bind="f.unread"></span>
    <span ng-bind="f.name"></span>
  </li>
</ul>