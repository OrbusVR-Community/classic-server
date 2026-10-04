/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var TraduWormSplit = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduWormSplit.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduWormSplit
});

TraduWormSplit.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.basicAttackPotency = 250;
    //this.monster.basicAttackPotency = 1;

    this.checkNearbyEvery = 1.5;
    this.timeSinceNearbyCheck = 0;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        othis.timeSinceNearbyCheck += args.delta;

        if(othis.timeSinceNearbyCheck > othis.checkNearbyEvery) {

            var nearbyMonsters = othis.monster.nearbyMonsters(15, 11, true);
            var numSplitWorms = 0;
            _.each(nearbyMonsters, function(amonster) {
                var thisBoss = amonster.gameObject.getComponent("TraduWormSplit") || amonster.gameObject.getComponent("TraduBoss5") || amonster.gameObject.getComponent("WormMini");

                if(thisBoss) {
                    numSplitWorms++;
                }
            });

            othis.monster.basicAttackEvery = Math.max(1.0, 2.5 - (0.25 * numSplitWorms));

            othis.timeSinceNearbyCheck = 0;
        }

    });
}


module.exports = TraduWormSplit;
