
<div class="articles-empty" ng-show="feeds.articles.length > 0 && currentIsEmpty()">
  <p>no articles</p>
</div>

<div class="articles panel-group" id="accordion" ng-show="feeds.articles.length > 0 && !currentIsEmpty()">
  <div ng-repeat="a in (filteredItems = (feeds.articles | orderBy: 'object.date':true))"
       ng-controller="feedCtrl"
       ng-class="{read: a.object.read, article: true}"
       ng-show="isShowable(a)">
    <div class="mark-unread" ng-show="a.object.read" ng-click="markRead(a, $index)">Mark Unread</div>
    <div class="article-content panel panel-default">
      <div class="article-title panel-heading">
        <a data-toggle="collapse" data-parent="#accordion" href="#article{{ $index }}">
          <h2 class="panel-title">{{ a.object.title }}</h2></a>
      </div>
      <div class="article-info">
        <p>feed: <i>{{ feeds.info[a.actor.address].name }}</i></p>
        <p>article: <a target="_blank" href="{{ a.object.link }}">link</a></p>
        <p rel="{{ a.object.date }}">date: <i>{{ a.object.date | fromNow}}</i></p>
      </div>
      <div id="article{{ $index }}" class="panel-collapse collapse">
        <div class="article-body panel-body" ng-click="markRead(a, $index)" data-ng-bind-html-unsafe="a.object.brief_html"></div>
      </div>
    </div>
  </div>
  <div ng-show="feeds.articles.length > 0">
    <div class="btn btn-default button-show-more">Show More</div>
  </div>
</div>