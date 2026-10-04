/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var MagicalElite = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicalElite.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicalElite
});

MagicalElite.prototype.Start = function() {
    var othis = this;

    this.gameObject.addEventListener("MonsterDeath", function() {
        //Okay, find all existing spawnGroupMates and tell them to stop being "magical".
        _.each(othis.gameObject.entity.spawnGroup, function(groupent) {
            if(!groupent.gameObject) return; //already dead?
            if(groupent.gameObject === othis.gameObject) return;
            groupent.gameObject.triggerEvent("PacifyMagic", {});
        });

    });
}


module.exports = MagicalElite;
