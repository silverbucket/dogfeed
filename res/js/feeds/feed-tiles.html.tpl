<div class="row">
  <div class="col-6 col-sm-6 col-lg-4" ng-show="feeds.infoArray.length == 0">
    <p>no feeds yet, add some!</p>
  </div><!--/span-->

  <div ng-repeat="f in feeds.infoArray | orderBy: 'name'"
       class="col-xs-6 col-sm-4 col-md-2 col-lg-2 feed-tile"
       title="{{ f.url }}"
       style="background: url({{(f.image) ? f.image : '/res/img/rss_feed_orange.png'}}) no-repeat center center;"
       ng-click="switchFeed(f.url, null, f.error)"
       ng-class="{active: isSelected(f.url), error: f.error}">
    <div class="feed-tile-loading" ng-show="f.loaded != true"></div>
    <div class="feed-tile-count">
      <span class="unread-count" ng-bind="f.unread"></span>
    </div>

    <div class="feed-tile-info">
      <span class="feed-title-text" ng-bind="f.name"></span>
    </div>
  </div><!--/span-->

</div><!--/row-->
