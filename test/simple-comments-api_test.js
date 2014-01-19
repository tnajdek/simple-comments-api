'use strict';

var api = require('../lib/simple-comments-api.js'),
	Parse = require('node-parse-api').Parse,
	Deferred = require("promised-io/promise").Deferred,
	all = require("promised-io/promise").all,
	_ = require('lodash'),
	appId = process.env.PARSE_APP_ID,
	masterKey = process.env.PARSE_MASTER_KEY,
	testapp;

/*
	======== A Handy Little Nodeunit Reference ========
	https://github.com/caolan/nodeunit

	Test methods:
		test.expect(numAssertions)
		test.done()
	Test assertions:
		test.ok(value, [message])
		test.equal(actual, expected, [message])
		test.notEqual(actual, expected, [message])
		test.deepEqual(actual, expected, [message])
		test.notDeepEqual(actual, expected, [message])
		test.strictEqual(actual, expected, [message])
		test.notStrictEqual(actual, expected, [message])
		test.throws(block, [error], [message])
		test.doesNotThrow(block, [error], [message])
		test.ifError(value)
*/

exports['awesome'] = {
	setUp: function(done) {
		var queued_comment1 = {
				name: 'tester',
				email: 'tester@tester.com',
				website: 'http://tester.com',
				comment: 'Hello World',
				slug: 'some-post'
			},
			approved_comment = {
				name: 'tester',
				comment: 'Just some text',
				slug: 'some-post'
			},
			queued_comment2 = {
				name: 'tester 2',
				email: 'tester2@tester.com',
				website: 'http://tester2.com',
				comment: 'Thats right!',
				slug: 'some-post'
			}, promises = [];

		function rejectOrResolve(promise, err, response) {
			if(err) {
				console.log(err);
				promise.reject(err);
			} else {
				promise.resolve(response);
			}
		}

		testapp = new Parse(appId, masterKey);

		//delete all entries in comments_queue
		promises.push(new Deferred());
		testapp.findMany('comments_queue', {}, _.partial(rejectOrResolve, _.last(promises)));
		_.last(promises).then(function(query) {
			query.results.forEach(function(item) {
				promises.push(new Deferred());
				testapp.delete('comments_queue', item.objectId, _.partial(rejectOrResolve, _.last(promises)));
			});
		});

		//delete all entries in comments_approved
		promises.push(new Deferred());
		testapp.findMany('comments_approved', {}, _.partial(rejectOrResolve, _.last(promises)));
		_.last(promises).then(function(query) {
			query.results.forEach(function(item) {
				promises.push(new Deferred());
				testapp.delete('comments_approved', item.objectId, _.partial(rejectOrResolve, _.last(promises)));
			});
		});
		all(promises).then(function() {
			//all delete deferreds should complete before we move on
			promises.push(new Deferred());
			testapp.insert('comments_queue', queued_comment1, _.partial(rejectOrResolve, _.last(promises)));
			promises.push(new Deferred());
			testapp.insert('comments_approved', approved_comment, _.partial(rejectOrResolve, _.last(promises)));
			_.last(promises).then(function(item) {
				queued_comment2.replyTo = item.objectId;
				promises.push(new Deferred());
				testapp.insert('comments_queue', queued_comment2, _.partial(rejectOrResolve, _.last(promises)));
				all(promises).then(function() {
					done();
				});
			});
		});
	},
	parseConfigured: function(test) {
		test.notEqual(typeof(appId), undefined);
		test.notEqual(typeof(masterKey), undefined);
		test.equal(appId.length, 40);
		test.equal(masterKey.length, 40);
		test.done();
	},
	retrievesQueuedComments: function(test) {
		api.getQueuedComments().then(function(comments) {
			test.equal(comments.length, 2);
			test.done();
		});	
	},
	canApproveComment: function(test) {
		api.getQueuedComments().then(function(comments) {
			var goodComment = comments.where({name: "tester"});
			api.approveComment(goodComment).then(function(comment) {
				testapp.findMany('comments_queue', {}, function(err, results) {
					test.equal(results.length, 1);
					test.eqau(comment.get('name'), 'tester');
					test.equal(results[0].name, 'tester 2');
					testapp.findMany('comments_approved', {}, function(err, results) {
						test.equal(results.length, 2);
						test.done();
					});
				});
			});
		});
	},
	canRejectComment: function(test) {
		api.getQueuedComments().then(function(comments) {
			var badComment = comments.where({name: "tester"});
			api.rejectComment(badComment).then(function(comment) {
				testapp.findMany('comments_queue', {}, function(err, results) {
					test.equal(results.length, 1);
					test.equal(comment.get('name'), 'tester');
					test.equal(results[0].name, 'tester 2');
					testapp.findMany('comments_approved', {}, function(err, results) {
						test.equal(results.length, 1);
						test.done();
					});
				});
			});
		});
	}
};
