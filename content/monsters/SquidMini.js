/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var SquidMini = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

SquidMini.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: SquidMini
});

SquidMini.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.dontBroadcastAggro = true;
    this.monster.xpModifier = 0.0;

    this.breathSize = 14;
    this.breathCastTime = 1;
    this.breathPotency = 1200;

    this.timeAlive = 0;

    this.didBreathAttack = false;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.didBreathAttack) return;
        othis.timeAlive += args.delta;
        if(othis.timeAlive > 6.5) {
            console.log("SQUID MINI EXPLODING!");
            othis.breathAttack();
            setTimeout(function() {
                if(othis.monster) othis.monster.suicide();
            }, 1500);
            
            othis.didBreathAttack = true;
        }
    });

    var othis = this;
}

SquidMini.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.transform.position;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "sphere", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        //finishCallback();
    });
};


module.exports = SquidMini;