<div class="row">
  <div class="col-6 col-sm-6 col-lg-4" ng-show="feeds.infoArray.length == 0">
    <p>no feeds yet, add some!</p>
  </div><!--/span-->

  <div ng-repeat="f in feeds.infoArray | orderBy: 'name'"
       class="col-xs-6 col-sm-4 col-md-2 col-lg-2 feed-tile"
       title="{{ f.url }}"
       ng-click="switchFeed(f.url, null, f.error)"
       ng-class="{'feed-entry': true, active: isSelected(f.url), error: f.error, loading: !f.loaded}">

    <div class="feed-tile"
         style="background: url({{f.image}}) no-repeat center center;">
      <div class="feed-tile-info">
        <span class="unread-count" ng-bind="f.unread"></span>
        <span ng-bind="f.name"></span>
      </div>
    </div>
  </div><!--/span-->

</div><!--/row-->
