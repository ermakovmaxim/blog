<!--
{
  "layout": "article",
  "title": "Stopping Event Propagation Breaks the Web",
  "date": "2014-04-29T21:02:45-07:00",
  "draft": true,
  "tags": [
    "JavaScript",
    "HTML"
  ]
}
-->

If you're a web developer, at some point in your career you've probably had to build a popup or dialog that dismissed itself after the user clicked anywhere else on the page. If you searched online to figure out the best way to do this, chances are you came across this Stack Overflow question: [How to detect a click outside an element?](http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element).

Here's what the highest rated answer recommends:

```javascript
$('html').click(function() {
  // Hide the menus if visible.
});

$('#menucontainer').click(function(event){
  event.stopPropagation();
});
```

This answer can be summarized as follows: If a click event propagates to the `<html>` element, hide the menus. If the click event originated inside `#menucontainer`, stop the event so it will never reach `<html>`, thus only clicks outside of `#menucontainer` will cause the menus to be hidden.

The above code is simple, elegant, and clever all at the same time. Yet, unfortunately, it's absolutely horrible advice.

This solution is roughly equivalent to fixing a leaky shower by turning off the water to the bathroom. It completely ignores the possibility that any other code on the page might need to know about that click event.

Still, it's the most upvoted answer to this question, so people take it as sound advice.

## The Problem with Events

Like a lot of things in JavaScript, DOM events are global. And as most people know, global variables make for messy, coupled code.

Modifying a single, fleeting event might not seem like a big deal, but as the use of third-party frameworks increases, altering browser-defined behavior can lead to some disastrous bugs. Bugs that, from my experience, are a nightmare to track down.

When you stop an event from propagating through the DOM, you're changing expectations in a way that library authors can't possibility predict or defend against. This problem is magnified by the increasing popularity of [event delegation](http://www.nczonline.net/blog/2009/06/30/event-delegation-in-javascript/). Every time you stop an event from bubbling up to the document, you're creating a potential bug in some other code on the page.

## What Can Go Wrong?

You might be thinking to yourself: who even writes code like this by hand anymore? I use a well-tested library like Bootstrap, so I can stop worrying, right?

Well, no. Unfortunately stopping event propagation is not just something recommended by bad Stack Overflow answers; it's also found in some of the most popular libraries in use today.

To prove this, let me show you how easy it is to create a bug by using Bootstrap in a Ruby on Rails app.

Rails ships with a JavaScript library called [jquery-ujs](https://github.com/rails/jquery-ujs) that allows developers to declaratively add remote AJAX calls to links via the `data-remote` attribute.

In the following example, if you open the dropdown and click anywhere else in the frame, the dropdown should close itself. However, if you open the dropdown and then click the "Remote Link", it doesn't work.

<p data-height="268" data-theme-id="1" data-slug-hash="KzHjc" data-default-tab="result" class='codepen'>See the Pen <a href='http://codepen.io/philipwalton/pen/KzHjc/'>Stop Propagation Demo</a> by Philip Walton (<a href='http://codepen.io/philipwalton'>@philipwalton</a>) on <a href='http://codepen.io'>CodePen</a>.</p>
<script async src="//codepen.io/assets/embed/ei.js"></script>

This bug happens because the Bootstrap code responsible for closing the dropdown menu is listening for click events on the document. But since jquery-ujs stops event propagation in its `data-remote` link handlers, those clicks never reach the document, so the Bootstrap code never runs.

The worst part about this bug is that there's absolutely nothing that Bootstrap (or any other library) can do to prevent stuff like this from happening. If you're writing code that deals with the DOM, you're always at the mercy of whatever other poorly-written code is running on the page. Such is the nature of global variables.

As a quick disclaimer, I'm not trying to single out jquery-ujs, I just happen to know this problem exists because I [encountered it myself](https://github.com/rails/jquery-ujs/issues/327) and had to work around it. In truth, tons of other libraries (including Bootstrap) unnecessarily stop event propagation.

It's a big problem, and it's all over the web.

## Why Do People Stop Event Propagation?

I already showed that there's some bad advice on the Internet promoting the use of `stopPropagation`, but that isn't the only reason people do it.

Frequently, developers stop event propagation without even realizing it.

### Return false

There's a lot of confusion about what happens when you return `false` from an event handler. Consider the following three cases that all appear to do the same thing:

```xml
<!-- Using an inline event handler. -->
<a href="http://google.com" onclick="return false">Google</a>
```

```javascript
// Using jQuery.
$('a').on('click', function() {
  return false;
});
```

```javascript
// Using native methods.
var link = document.querySelector('a');

link.addEventListener('click', function() {
  return false;
});
```

These three examples all look like they should do the same thing, but the results are actually quite different. Here's what happens in each of these cases:

1. Returning `false` from an inline event handler prevents the browser from navigating to the link address, but it doesn't stop the event from propagating through the DOM.
2. Returning `false` from a jQuery event handler prevents the browser from navigating to the link address **and** it stops the event from propagating through the DOM.
3. Returning `false` from a regular DOM event handler does absolutely nothing.

If you're shaking your head in disbelief right now, you're not alone. These differences are incredibly confusing and annoying.

Fortunately, the methods `stopPropagation` and `preventDefault` actually do work the same in both jQuery and native DOM event handlers. The following function could be passed to either jQuery's `on()` method or the browsers native `addEventListener()` method and the result would be the same:

```javascript
function stop(event) {
  event.preventDefault();
  event.stopPropagation();
}
```

Because of the confusion around `return false`, I'd recommend never using it.

Furthermore, since returning `false` from a jQuery event handler stops the event from propagating, doing so could easily lead to any of the problems described in this article.

**Note:** If you use jQuery with CoffeeScript (which automatically returns the last expression in a function) make sure you don't end your event handlers with anything that evaluates to the Boolean `false` or you'll have the same problem.

###  Performance

Back in the days of IE6 and other terribly slow browsers, a complicated DOM could really slow down your site. And since events travel through the entire DOM, the more nodes you have, the slower everything is.

Peter Paul Koch of [quirksmode.org](http://www.quirksmode.org/js/events_order.html) recommended this practice in an old article on the subject:

> if your document structure is very complex (lots of nested tables and such) you may save system resources by turning off bubbling. The browser has to go through every single ancestor element of the event target to see if it has an event handler. Even if none are found, the search still takes time.

With today's modern browsers, however, there is essentially no noticeable performance gain from stopping event propagation. Unless you absolutely know what you are doing and very strictly control all the code on your pages, I do not recommend this approach.

## What To Do Instead

As a general rule, stopping event propagation should never be a solution to a difficult coding challenge. Instead, stopping propagation should only ever be used for one purpose: to make it as if the event never happened.

In the "How to detect a click outside of an element?" example above, the purpose of calling `stopPropagation` isn't to get rid of the click event altogether, it's to avoid running some code that will hide the menu in one particular situation.

In addition to this being a bad idea because it alters global behavior, it's also a bad idea because it puts the menu hiding logic in two different and unrelated places, making it far more fragile than necessary.

A much better solution is to have a single event handler whose logic is fully encapsulated and whose sole responsibility is to determine whether or not the menu should be hidden for the given event.

As it turns out, this better option also ends up requiring less code:

```javascript
$(document).on('click', function(event) {
  if (!$(event.target).closest('#menucontainer').length) {
    // Hide the menus.
  }
});
```

The above handler listens for clicks on the document and checks to see if the event target is `#menucontainer` or has `#menucontainer` as a parent. If it doesn't, you know the click originated from outside of `#menucontainer`, and you can hide the menus if they're visible.

I'm sure some readers will notice that this solution requires a bit more DOM traversal than the original. Though, hopefully, I've convinced you that the benefits of this approach far outweigh the costs of such a small performance hit. I will gladly trade a few microseconds of DOM lookup today if it lowers the likelihood of spending a few hours tracking down bugs in the future.

### Default Prevented?

Many developers will stop event propagation because they've called `preventDefault` and think that subsequent event handlers should no longer apply. But this usually isn't the case.

Consider the Bootstrap and Rails example shown above. `data-remote` link handlers prevent default because they need to make an AJAX request instead of navigating to the link address. But clearly that doesn't mean an open Bootstrap dropdown shouldn't close when that link is clicked.

About a year ago I thought it would be valuable to create an event handling library that, instead of ever stopping propagation, would simply mark certain events as "handled". This would allow handlers registered farther up the DOM to inspect the event and, based on whether or not it had been "handled", determine if any further action was needed.

This seemed nice in theory, but what I found was in all cases where I wanted to treat a "handled" event differently than an unhandled event, those events had also had their default action prevented. I realized that the DOM already provided such a method: `defaultPrevented`.

To make this more clear, imagine you're adding an event handler to the document to use Google Analytics to track when the user clicks on links to external domains. It might look something like this:

```javascript
$(document).on('click', 'a', function() {
  if (this.hostname != 'css-tricks.com') {
    ga('send', 'event', 'Outbound Link', this.href);
  }
});
```

The problem here, though, is that in the case of a link that points to an external domain, but whose default gets prevented (e.g. a Twitter share link), the users won't actually go to that URL and thus you don't want to track it (at least not in this category).

The solution to this problem is actually pretty simple, and doesn't require stopping event propagation. All you have to do is check to see if the default action has been prevented:

```javascript
$(document).on('click', 'a', function() {

  // Ignore this event if preventDefault has been called.
  if (event.defaultPrevented) return;

  if (this.hostname != 'css-tricks.com') {
    ga('send', 'event', 'Outbound Link', this.href);
  }
});
```

Since calling `preventDefault` in click handlers for links will always prevent the browser from navigating to that link's address, you can be 100% confident that if `defaultPrevented` is true, the user did not go to that address.

In my experience, a large portion of the code I see using `stopPropagation` could easily be rewritten to check `event.defaultPrevented` instead. The next time you're faced with this dilemma, think about what you're really trying to accomplish.

## Conclusion

Hopefully this article has helped you think about DOM events in a new light. They're not isolated pieces that can be modified without consequence. They're global, interconnected objects that often affect far more code than you realize.

To avoid bugs, it's almost always best to leave events alone and let them propagate as the browser intended.

If you're ever unsure about what to do, just ask yourself the following question: is it possible that some other code, either now or in the future, might want to know that this event happened? The answer is usually yes.

Whether it be as trivial as a Bootstrap modal or as critical event tracking analytics, if something might ever want to know about an event, it's better to leave it alone and find another solution.