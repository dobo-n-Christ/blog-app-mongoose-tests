'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function generateBlogPostData() {
    return {
        title: faker.lorem.words,
        content: faker.lorem.paragraph,
        author: {
            firstName: faker.name.firstName,
            lastName: faker.name.lastName
        }
    };
};

function seedBlogPostData() {
    console.info('Seeding blog post data');
    const seedData = [];
    for (let i = 0; i < 10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
};

function tearDownDatabase() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
};

describe('BlogPosts API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function() {
        return seedBlogPostData();
    });
    afterEach(function() {
        return tearDownDatabase();
    });
    after(function() {
        return closeServer();
    });
    
    describe('GET endpoint', function() {
        it('should retrieve all existing blog posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res) {
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.length).to.be.above(0);
                return BlogPost.count();
            })
            .then(function(count) {
                expect(res.body.length).to.equal(count);
            });
        });
        it('should return blog posts with correct fields', function() {
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body.length).to.be.above(0);
                res.body.forEach(function(post) {
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys('id', 'title', 'content', 'author', 'created');
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(function(post) {
                expect(resPost.title).to.equal(post.title);
                expect(resPost.content).to.equal(post.content);
                expect(resPost.author).to.equal(post.author);
            });
        });
    });

    describe('POST endpoint', function() {
        it('should create a new blog post', function() {
            const newPost = generateBlogPostData();
            return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res) {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'title', 'content', 'author', 'created');
                expect(res.body.title).to.equal(newPost.title);
                expect(res.body.content).to.equal(newPost.content);
                expect(res.body.author).to.equal(newPost.author);
                return BlogPost.findById(res.body.id);
            })
            .then(function(post) {
                expect(post.title).to.equal(newPost.title);
                expect(post.content).to.equal(newPost.content);
                expect(post.author).to.equal(newPost.author);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should update a blog post by id', function() {
            const updatePost = {
                title: 'Newness',
                content: 'For all is newness here.',
                author: 'New Man'
            };
            return BlogPost.findOne()
            .then(function(post) {
                updatePost.id = post.id;
                return chai.request(app)
                .put(`/posts/${post.id}`)
                .send(updatePost);
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(updatePost.id);
            })
            .then(function(post) {
                expect(post.title).to.equal(updatePost.title);
                expect(post.content).to.equal(updatePost.content);
                expect(post.author).to.equal(updatePost.author);
            });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete a blog post by id', function() {
            let post;
            return BlogPost.findOne()
            .then(function(_post) {
                post = _post;
                return chai.request(app)
                .delete(`/posts/${post.id}`)
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(function(_post) {
                expect(_post).to.not.exist;
            });
        });
    });
});
