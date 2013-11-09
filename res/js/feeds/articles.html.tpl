<div><input type="text" ng-model="settings.showRead"></div>

<div ng-show="feeds.articles.length == 0 && !currentIsEmpty(settings)">
  <about></about>
</div>

<div class="articles" ng-show="feeds.articles.length > 0 && currentIsEmpty(settings)">
  <p>no articles</p>
</div>

<div class="articles" ng-show="feeds.articles.length > 0 && !currentIsEmpty(settings)">
  <div ng-repeat="a in (filteredItems = (feeds.articles | orderBy: 'object.date':true))"
       ng-controller="feedCtrl"
       ng-class="{read: a.object.read, article: true}"
       ng-show="isShowable(a.actor.address, a.object.read, settings, a.object.link)">
    <div class="mark-unread" ng-show="a.object.read" ng-click="markRead(a.object.link, false)">Mark Unread</div>
    <div class="article-content" ng-click="markRead(a.object.link, true)">
      <div class="article-title">
        <a target="_blank" href="{{ a.object.link }}">
          <h2>{{ a.object.title }}</h2></a>
      </div>
      <div class="article-info">
        <p>feed: <i>{{ feeds.info[a.actor.address].name }}</i></p>
        <p rel="{{ a.object.date }}">date: <i>{{ a.object.date | fromNow}}</i></p>
      </div>
      <div class="article-body" data-ng-bind-html-unsafe="a.object.brief_html"></div>
    </div>
  </div>
  <div ng-show="feeds.articles.length > 0">
    <div class="btn btn-default button-show-more">Show More</div>
  </div>
</div>