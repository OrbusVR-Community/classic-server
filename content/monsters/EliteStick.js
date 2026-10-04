/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var EliteStick = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteStick.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteStick
});

EliteStick.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 14;
    this.monster.basicAttackDelay = 1;
    this.monster.setMovementSpeed(6.5);
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }

    this.prayerEvery = 4;
    this.timeSincePrayer = 0;

    this.seedpodEvery = 5;
    this.timeSinceSeedpod = 0;
    this.seedPodPotency = 600;

    this.spitSize = new Vector3(4, 4, 4);
    this.spitDelay = 2;
    this.spitPotency = 500;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSincePrayer++;
        othis.timeSinceSeedpod++;

        if(othis.timeSincePrayer > othis.prayerEvery) {
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 1500);
            othis.doPrayer();
            othis.timeSincePrayer = 0;
        }

        if(othis.timeSinceSeedpod > othis.seedpodEvery) {
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 1500);
            
            othis.doSeedpods();
            othis.timeSinceSeedpod = 0;
        }
    });
}

EliteStick.prototype.doSeedpods = function() {
    //Choose two people at random and send a seedpod at them.
    this.monster.triggerAnimation("spellcast");
    var currentAggroTable = this.monster.getSortedAggroTable();
    for(var i=0; i < 2; i++) {
        var thisTarget = _.sample(currentAggroTable);
        if(thisTarget) {
            this.spawnPod(thisTarget.targetGo);
        }
    }
}

EliteStick.prototype.spawnPod = function(targetGameObject) {
    var othis = this;
    var mypos = this.gameObject.getWorldPosition();
    var targetpos = targetGameObject.getWorldPosition();

    if(othis.monster.isDead) return;
    if(!othis.gameObject || !othis.gameObject.zone) return;
    var newmissile = othis.gameObject.zone.spawnEntity("Seedpod", new Vector3(targetpos.x, targetpos.y + 20.0, targetpos.z));
    var podComponent = newmissile.gameObject.getComponent("Seedpod");
    podComponent.firingEntity = othis.gameObject.entity;
    podComponent.trackingTarget = targetGameObject;
    podComponent.dmgAmount = othis.monster.potencyDamage(othis.seedPodPotency);
    podComponent.speed = 5.0;
}

EliteStick.prototype.doPrayer = function() {
    this.monster.triggerAnimation("prayer");
    var othis = this;

    _.each(this.gameObject.entity.spawnGroup, function(groupent) {
        if(!groupent.gameObject) return; //already dead?
        if(groupent.gameObject === othis.gameObject) return;
        var targetpos = groupent.gameObject.getWorldPosition();
        var entPos = targetpos;
        var newent = othis.gameObject.zone.spawnEntity("MomentaryExplosion", entPos);
        var dangerComponent = newent.gameObject.getComponent("MomentaryDanger");
        dangerComponent.dangerZone(entPos, othis.spitSize, othis.spitDelay, function(objectsHit) {
            _.each(objectsHit, function(anobj) {
                othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.spitPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            });
        });
    });
}


module.exports = EliteStick;
