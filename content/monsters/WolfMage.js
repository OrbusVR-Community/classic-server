/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var WolfMage = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

WolfMage.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: WolfMage
});

WolfMage.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 10;
    this.monster.basicAttackPotency = 50;

    this.healPotency = 600;

    this.healEverySeconds = 6;
    this.timeSinceHeal = 0;

    this.bolsterDuration = 3;
    this.dmgBoostPct = 0.50;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceHeal += args.delta;

        if(othis.timeSinceHeal > othis.healEverySeconds) {
            //Look for nearby allies who are low on health.
            var didHeal = false;
            _.each(othis.gameObject.entity.spawnGroup, function(targetEnt) {
                if(didHeal) return;
                if(!targetEnt.gameObject) return;
                var targetMonster = targetEnt.gameObject.getComponent("Monster");
                if(!targetMonster) return;
                if(targetMonster.getSyncedVar("maxHitPoints") - targetMonster.getSyncedVar("hitPoints") > -1 * othis.monster.potencyHealing(othis.healPotency)) {
                    othis.healAlly(targetMonster.gameObject);
                    didHeal = true;
                    othis.timeSinceHeal = 0;
                    args.takeOpportunity();
                    setTimeout(function() {
                        args.finishOpportunity();
                    }, 1000);
                }
            });

        }

        if(didHeal) return;

        //Look for non-bolstered nearby enemies.
        var didBolster = false;
        _.each(othis.gameObject.entity.spawnGroup, function(targetEnt) {
            if(didBolster) return;
            if(!targetEnt.gameObject) return;
            if(targetEnt.gameObject === othis.gameObject) return; // don't bolster ourselves.

            var targetMonster = targetEnt.gameObject.getComponent("Monster");
            if(!targetMonster) return;
            if(!targetMonster.hasStatusEffect(13)) {
                othis.bolsterAlly(targetMonster);
                didBolster = true;
                args.takeOpportunity();
                setTimeout(function() {
                    args.finishOpportunity();
                }, 1000);
            }
        });

    });

    this.monster = this.gameObject.getComponent("Monster");
}

WolfMage.prototype.healAlly = function(/*GameObject*/ healTarget) {
    var targetEntity = healTarget.entity;
    if(targetEntity == null) {
        console.log("ERROR: Unable to find an entity for my heal target...");
        return;
    }

    this.broadcastToActiveClients(1, ["byte"], [3]);
    var othis = this;
    setTimeout(function() {
        if(!targetEntity || !targetEntity.gameObject || !othis.gameObject || othis.monster.isDead) return;
        healTarget.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyHealing(othis.healPotency), sender: othis.gameObject.entity, dmgType: "magical"});
    }, 1000);

}

WolfMage.prototype.bolsterAlly = function(targetMonster) {
    this.broadcastToActiveClients(1, ["byte"], [2]);
    var othis = this;
    setTimeout(function() {
        if(!targetMonster || !targetMonster.gameObject || !othis.gameObject || othis.monster.isDead) return;
        targetMonster.addStatusEffect(StatusEffects.Effects.Bolster, othis.bolsterDuration, {damageBoostPercent: othis.dmgBoostPct, sourceEntity: othis.gameObject.entity});
    }, 1000);
}



module.exports = WolfMage;
