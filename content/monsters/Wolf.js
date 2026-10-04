/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;

var Wolf = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);

    this.hasSkull = componentOpts.hasSkull;
    this.spawnedMinions = [];
};

Wolf.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Wolf
});

Wolf.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.roamDistance = 25;
    this.monster.setMovementSpeed(6.5);

    var didSummon = false;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        if(!othis.hasSkull) return;
        if(didSummon) return;

        if(othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints") < 0.50) {
            didSummon = true;
            if(Chance.rollPercentChance(99)) {
                var numMinions = Math.ceil(Math.random() * 2);
                if(args.takeOpportunity()) {
                    args.finishOpportunity();
                }
                othis.monster.triggerAnimation("howl");
                setTimeout(function() {
                    if(!othis.monster || othis.monster.isDead) return;
                    for(var i=0; i < numMinions; i++) {
                        othis.spawnMinion("Wolf", othis.monster.getSyncedVar("willLevel"), _.sample(othis.monster.getSortedAggroTable()));
                    }
                }, 1000);
                
            }
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
    });
};

Wolf.prototype.spawnMinion = function(minionName, minionLevel, targetGameObject) {
    var othis = this;
    var randomval = Math.random() * 4;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity(minionName, new Vector3(myworldpos.x + randomval, myworldpos.y, myworldpos.z + randomval));
    var newmonster = newent.gameObject.getComponent("Monster");
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
        if(targetGameObject && targetGameObject.entity) {
            newmonster.addAggroForEntity(targetGameObject.entity, 100);
        }
    });
    this.spawnedMinions.push(newmonster);
}


module.exports = Wolf;
