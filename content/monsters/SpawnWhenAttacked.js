/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var SpawnWhenAttacked = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);

    this.spawnMinions = componentOpts.spawnMinions;
};

SpawnWhenAttacked.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: SpawnWhenAttacked
});

SpawnWhenAttacked.prototype.Start = function() {
    var othis = this;

    this.timeSinceSpawn = 60;
    this.spawnEvery = 60;

    this.checkForDespawnEvery = 5;
    this.timeSinceDespawnCheck = 0;

    this.monster = this.gameObject.getComponent("Monster");

    this.spawnedMinions = [];

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeSinceSpawn += args.delta;
        othis.timeSinceDespawnCheck += args.delta;

        if(othis.timeSinceDespawnCheck > othis.checkForDespawnEvery && othis.spawnMinions.length > 0) {
            var nearbyMonsters = othis.monster.nearbyMonsters(200, 15);
            if(nearbyMonsters.length === 0) {
                othis.despawnMinions();
            }
        }
    });

    this.gameObject.addEventListener("TakeDamage", function(args) {
        if(othis.timeSinceSpawn > othis.spawnEvery) {
            othis.doMinionSpawn();
            othis.timeSinceSpawn = 0;
        }
    });
}

SpawnWhenAttacked.prototype.doMinionSpawn = function() {
    if(!this.spawnMinions) return;

    var othis = this;

    var nearbyMonsters = this.monster.nearbyMonsters(200, 15);
    var splitminions = this.spawnMinions.split(",");

    _.each(splitminions, function(mtype) {
        var minfo = mtype.split("@");
        var randomNearbyMonster = _.sample(nearbyMonsters);
        var targetGameObject = null;
        if(randomNearbyMonster) {
            targetGameObject = randomNearbyMonster.gameObject;
        }
        othis.spawnMinion(minfo[0], minfo[1], targetGameObject);
    });
}

SpawnWhenAttacked.prototype.spawnMinion = function(minionName, minionLevel, targetGameObject) {
    var othis = this;
    var randomval = Math.random() * 4;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity(minionName, new Vector3(myworldpos.x + randomval, myworldpos.y, myworldpos.z + randomval));
    var newmonster = newent.gameObject.getComponent("Monster");
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
        newmonster.xpModifier = 0;
        if(targetGameObject) {
            newmonster.addAggroForEntity(targetGameObject.entity, 100);
        }
    });
    this.spawnedMinions.push(newmonster);
}

SpawnWhenAttacked.prototype.despawnMinions = function() {
    var othis = this;
    _.each(othis.spawnedMinions, function(aminion) {
        if(!aminion.isDead) {
            aminion.suicide();
        }
    });
    othis.spawnedMinions = [];
}

module.exports = SpawnWhenAttacked;
