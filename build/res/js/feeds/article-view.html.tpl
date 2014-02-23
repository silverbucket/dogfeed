<div ng-repeat="a in (filteredItems = (feeds.articles | orderBy: 'object.date':true))"
     ng-class="{read: a.object.read, article: true}"
     ng-controller="feedCtrl"
     ng-show="isShowable(a)">
  <div class="mark-unread" ng-show="a.object.read" ng-click="toggleRead(a, $index)">Mark Unread</div>
  <div class="mark-read" ng-show="!a.object.read" ng-click="toggleRead(a, $index)">Mark Read</div>
  <div class="article-content panel panel-default">
    <div class="article-title panel-heading" data-toggle="collapse" data-parent="#accordion" data-target="#article{{ $index }}">
      <h2 class="panel-title">{{ a.object.title }}</h2>
      <span class="article-toggle glyphicon"
            ng-class="{'glyphicon-chevron-down': (!a.object.read)}"></span>
    </div>

    <div id="article{{ $index }}" class="panel-collapse collapse">
      <div class="article-body panel-body" ng-click="toggleRead(a, $index)" data-ng-bind-html="a.object.brief_html"></div>
      <div ng-repeat="m in a.object.media"
           class="article-audio">
        <audio controls ng-src="{{ m.url }}" type="{{ m.type }}">
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>

    <div class="article-info">
      <div class="col-xs-6 col-sm-4"><p><i>{{ feeds.info[a.actor.address].name }}</i></p></div>
      <div class="col-xs-6 col-sm-4"><p rel="{{ a.object.date }}"><i>{{ a.object.date | fromNow}}</i></p></div>
      <div class="col-xs-12"><a class="btn btn-default button-article-link" target="_blank" href="{{ a.object.link }}">visit article link</a></div>
    </div>
  </div>
</div>