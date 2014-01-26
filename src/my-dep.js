/**
 * Created by wil on 15/01/2014.
 */
define(

    [
        './sub-dep'
    ],

    function(SubDep) {

        "use strict";

        return {
            name: 'MyDep',
            child: SubDep
        };
    }
);
