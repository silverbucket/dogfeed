<h4 ng-transclude></h4>
<div><input type="text" ng-model="settings.showRead"></div>
<ul class="nav nav-list nav-pills nav-stacked">
  <li ng-click="switchFeed()" ng-class="{active: isSelected(), 'all-feeds': true}">
      <span class="glyphicon glyphicon-globe"></span> <span>All Items</span>
  </li>
  <li ng-show="feeds.infoArray.length == 0"><span>no feeds yet, add some!</span></li>
  <li ng-repeat="g in feeds.groupArray | orderBy: 'name'"
      data-toggle="tooltip"
      data-init="showSettings = false"
      ng-mouseover="showSettings = true"
      ng-mouseleave="showSettings = false"
      title="{{ g.name }}"
      ng-click="switchFeed(null, g.id, g.error)"
      ng-class="{'feed-entry': true, active: isSelected(g.id), error: g.error, loading: !g.loaded, 'group-entry': true}">
    <span ng-click="showFeedSettings(g.id)"
          ng-class="{glyphicon: g.loaded, 'glyphicon-cog': (g.loaded || g.error) && showSettings, settings: true, 'icon-loading-small': !g.loaded}"></span>
    <span class="unread-count" ng-bind="g.unread"></span>
    <span ng-bind="g.name"></span>
  </li>
  <li ng-repeat="f in feeds.infoArray | orderBy: 'name'"
      data-toggle="tooltip"
      ng-init="showSettings = false"
      ng-mouseover="showSettings = true"
      ng-mouseleave="showSettings = false"
      title="{{ f.url }}"
      ng-click="switchFeed(f.url, null, f.error)"
      ng-class="{'feed-entry': true, active: isSelected(f.url), error: f.error, loading: !f.loaded}">
    <span ng-click="showFeedSettings(f.url)"
          ng-class="{glyphicon: f.loaded, 'glyphicon-cog': (f.loaded || f.error) && showSettings, settings: true, 'icon-loading-small': !f.loaded}"></span>
    <span class="unread-count" ng-bind="f.unread"></span>
    <span ng-bind="f.name"></span>
  </li>
</ul>