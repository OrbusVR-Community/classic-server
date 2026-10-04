/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var BishopRomaFight = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

BishopRomaFight.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: BishopRomaFight
});

BishopRomaFight.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4;
    this.monster.setMovementSpeed(6.5);

    this.timeSinceFassithAggroed = 5;
    this.aggroFassithEvery = 5;

    this.timeSinceSuck = 0;
    this.suckEverySeconds = 6;

    this.soulsuckRadius = 6;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 600;

    this.portalTriggered = false;
    this.fassithKilled = false;

    this.monster.PreAttackCallback = function(dmgAmount, currentHp, attackingMonster) {
        var healthPct = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");

        if(healthPct < 0.50) {
            //othis.killFassith();
        }

        if(healthPct < 0.25) {
            othis.triggerPortal();
            return 0;
        }
        else {
            return dmgAmount;
        }
    };

    //Look for nearby Fassiths and constantly make sure they aggro us.
    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeSinceFassithAggroed += args.delta;

        if(othis.timeSinceFassithAggroed > othis.aggroFassithEvery) {
            var myFassith = othis.findNearbyFassith();
            othis.timeSinceFassithAggroed = 0;
            if(myFassith) {
                myFassith.addMaxAggroForEntity(othis.gameObject.entity);
            }
        }
    });

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceSuck += args.delta;

        if(othis.timeSinceSuck > othis.suckEverySeconds) {
            if(args.takeOpportunity()) {
                othis.soulSuck(args.finishOpportunity);
                othis.timeSinceSuck = 0;
            }
        }

    });

}

BishopRomaFight.prototype.findNearbyFassith = function() {
    var nearbyMonsters = this.monster.nearbyMonsters(200, 0);
    var foundFassith = null;
    _.each(nearbyMonsters, function(amonster) {
        if(amonster.gameObject.getComponent("FassithFight")) {
            foundFassith = amonster;
        }
    });

    return foundFassith;
}

BishopRomaFight.prototype.soulSuck = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    // var suckCenter = this.gameObject.transform.position;
    // this.broadcastToActiveClients(1, ["float", "float"], [this.soulsuckRadius, this.soulsuckCastTime]); 

    this.monster.dangerZone("directional", "sphere", this.gameObject.transform.position, this.soulsuckRadius, this.soulsuckCastTime, 1, function(collisionObjs) {
        var soulsuckDamage = othis.monster.potencyDamage(othis.soulsuckPotency);
        var targetsHit = 0;
        _.each(collisionObjs, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "magical"});
            targetsHit++;
        });
        //Heal myself based ont he amount of targets I hit.
        othis.gameObject.triggerEvent("TakeDamage", {dmgAmount: -1 * targetsHit * soulsuckDamage * 0.5, dmgType: "magical"});
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath animation to finish before we make our next move.
    });
};

BishopRomaFight.prototype.triggerPortal = function() {
    if(this.portalTriggered) return;
    var othis = this;
    this.portalTriggered = true;
    this.monster.triggerAnimation("portal");
    setTimeout(function() {
        othis.monster.suicide();
        var nearbyMonsters = othis.monster.nearbyMonsters(200, 15);
        _.each(nearbyMonsters, function(amonster) {
            var _pcc = amonster.gameObject.getComponent("PlayerCharacterComponent");
            if(_pcc) {
                _pcc.addPlayerFlag("qf_roma-die");
            }
        });
    }, 2000);
}

BishopRomaFight.prototype.killFassith = function() {

    if(this.fassithKilled) return;

    this.fassithKilled = true;

    var myFassith = this.findNearbyFassith();
    if(myFassith) {
        myFassith.suicide();
    }
}


module.exports = BishopRomaFight;
