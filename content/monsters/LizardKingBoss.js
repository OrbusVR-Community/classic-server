/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var LizardKingBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

LizardKingBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: LizardKingBoss
});

LizardKingBoss.prototype.Start = function() {
    var othis = this;

    this.minionsToDestroy = [];

    this.gameObject.zone.setZoneVar("lizardBossAlive", true);
    this.gameObject.zone.setZoneVar("lizardBossEngaged", false);

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.basicAttackEvery = 2;
    this.monster.basicAttackPotency = 250;
    this.monster.basicAttackDelay = 1.5;
    this.monster.deathDelay = 6;
    this.monster.giveUpChaseAfter = 120;
    this.monster.roamDistance = 0;

    this.timeSinceSpit = 0;
    this.spitEveryMoves = 3;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.gameObject.zone.setZoneVar("lizardBossEngaged", true);
        othis.timeSinceSpit++;
        if(othis.timeSinceSpit > othis.spitEveryMoves) {
            othis.timeSinceSpit = 0;
            args.takeOpportunity();
            othis.spit(args);
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function(args) {
        othis.resetMinions();
        othis.gameObject.zone.setZoneVar("lizardBossEngaged", false);
    });

    this.gameObject.addEventListener("MonsterDeath", function() {
        othis.resetMinions();
        othis.gameObject.zone.setZoneVar("lizardBossAlive", false);
        othis.gameObject.zone.setZoneVar("lizardBossEngaged", false);
    });
}

LizardKingBoss.prototype.resetMinions = function() {
    var othis = this;
    _.each(othis.minionsToDestroy, function(aminion) {
        if(!aminion.gameObject) return;
        var amonster = aminion.gameObject.getComponent("Monster");
        if(amonster) {
            amonster.suicide();
        }
        else {
            aminion.selfDestruct();
        }
    });

    othis.minionsToDestroy = [];
};

LizardKingBoss.prototype.spit = function(args) {

    var othis = this;

    this.monster.triggerAnimation("spit");

    var targetPos = this.gameObject.getWorldPosition().add(this.gameObject.forward().multiplyScalar(3.0));
    console.log(targetPos);

    var newminion = this.gameObject.zone.spawnEntity("DangerPool", targetPos);
    var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
    dangerPoolComponent.Setup(3.0, this.monster.potencyDamage(600), this.gameObject.entity);
    this.trackMinion(newminion);

    setTimeout(function() {
        args.finishOpportunity();
    }, 2000);
}

LizardKingBoss.prototype.trackMinion = function(aminion) {
    var othis = this;
    aminion.gameObject.addEventListener("MonsterDeath", function() {
        othis.minionsToDestroy = _.without(othis.minionsToDestroy, aminion);
    });
    this.minionsToDestroy.push(aminion);
}


module.exports = LizardKingBoss;
