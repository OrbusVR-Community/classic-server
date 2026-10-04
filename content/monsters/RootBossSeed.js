/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var RootBossSeed = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
    this.fallDirection = new Vector3(0,0,0);
};

RootBossSeed.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: RootBossSeed
});

RootBossSeed.prototype.Start = function() {
    var othis = this;

    this.hasHitGround = false;
    this.fallSpeed = 10.0;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.hasAggroTable = false;
    this.monster.sleepAfter = 0;
    this.monster.isSleeping = false;
    this.monster.neverRegen = true;
    this.monster.xpModifier = 0.0;

    this.timeUntilSpawn = 12.0;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.hasHitGround) {
            var nextpos = othis.gameObject.getWorldPosition().add(othis.fallDirection.multiplyScalar(othis.fallSpeed * args.delta));
            var groundHeight = othis.gameObject.zone.getGroundHeightAt(nextpos.x, nextpos.z);
            if(nextpos.y < groundHeight) {
                nextpos.y = groundHeight;
                othis.hasHitGround = true;
            }
            othis.gameObject.transform.setNewPosition(nextpos);
        }
        else {

            othis.timeUntilSpawn = othis.timeUntilSpawn - args.delta;
            if(othis.timeUntilSpawn < 0.0 && !othis.hasSpawned) {
                othis.hasSpawned = true;
                var newminion = othis.gameObject.zone.spawnEntity("RootManBig", othis.gameObject.getWorldPosition());
                othis.myBoss.trackMinion(newminion);
                var newmonster = newminion.gameObject.getComponent("Monster");
                newmonster.xpModifier = 0.0;
                newmonster.scaleToLevel(othis.monster.getSyncedVar("willLevel"));
                var nearbyMonsters = othis.monster.nearbyMonsters(200, 15);
                if(nearbyMonsters.length > 0) {
                    newmonster.addAggroForEntity(nearbyMonsters[0].gameObject.entity, 100);
                }
                othis.gameObject.entity.selfDestruct();
            }

        }
    })
}


module.exports = RootBossSeed;
