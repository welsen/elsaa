var Acl = (function () {
    'use strict';

    function Acl(db) {
        this.DB = db;
        this.UsersTable = 'ACL_USERS';
        this.RolesTable = 'ACL_ROLES';
        this.PermissionsTable = 'ACL_PERMISSIONS';
        this.RolePermissionsTable = 'ACL_ROLEPERMISSIONS';
        this.UserRolesTable = 'ACL_USERROLES';
        this.LastResult = null;

        var self = this;

        self.DB.serialize(function () {
            self.DB.parallelize(function () {
                self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", self.UsersTable, function (error, row) {
                    if (error === null) {
                        if (row === undefined) {
                            self.DB.run("CREATE TABLE ACL_USERS(\
                                ID          INTEGER     PRIMARY KEY AUTOINCREMENT,\
                                USERNAME    TEXT        NOT NULL,\
                                PASSWORD    TEXT        NOT NULL,\
                                EMAIL       TEXT        NOT NULL,\
                                FULLNAME    TEXT        NULL,\
                                TYPE        CHAR(10)    NULL,\
                                CREATED     INTEGER     NOT NULL,\
                                MODIFIED    INTEGER     NOT NULL,\
                                ACTIVE      BOOLEAN     NOT NULL\
                            );");
                        }
                    }
                });
                self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", self.RolesTable, function (error, row) {
                    if (error === null) {
                        if (row === undefined) {
                            self.DB.run("CREATE TABLE ACL_ROLES(\
                                ID          INTEGER     PRIMARY KEY AUTOINCREMENT,\
                                ROLENAME    TEXT        NOT NULL,\
                                DESCRIPTION TEXT        NOT NULL,\
                                PARENT      INTEGER     NULL,\
                                CREATED     INTEGER     NOT NULL,\
                                MODIFIED    INTEGER     NOT NULL,\
                                ACTIVE      BOOLEAN     NOT NULL\
                            );");
                        }
                    }
                });
                self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", self.PermissionsTable, function (error, row) {
                    if (error === null) {
                        if (row === undefined) {
                            self.DB.run("CREATE TABLE ACL_PERMISSIONS(\
                                ID          INTEGER     PRIMARY KEY AUTOINCREMENT,\
                                PERMISSION  TEXT        NOT NULL,\
                                DESCRIPTION TEXT        NOT NULL,\
                                PARENT      INTEGER     NULL,\
                                CREATED     INTEGER     NOT NULL,\
                                MODIFIED    INTEGER     NOT NULL,\
                                ACTIVE      BOOLEAN     NOT NULL\
                            );");
                        }
                    }
                });
                self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", self.RolePermissionsTable, function (error, row) {
                    if (error === null) {
                        if (row === undefined) {
                            self.DB.run("CREATE TABLE ACL_ROLEPERMISSIONS(\
                                ROLEID       INTEGER     NOT NULL,\
                                PERMISSIONID INTEGER     NOT NULL,\
                                CREATED      INTEGER     NOT NULL,\
                                MODIFIED     INTEGER     NOT NULL,\
                                ACTIVE       BOOLEAN     NOT NULL,\
                                PRIMARY KEY (ROLEID, PERMISSIONID)\
                            );");
                        }
                    }
                });
                self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", self.UserRolesTable, function (error, row) {
                    if (error === null) {
                        if (row === undefined) {
                            self.DB.run("CREATE TABLE ACL_USERROLES(\
                                USERID      INTEGER     NOT NULL,\
                                ROLEID      INTEGER     NOT NULL,\
                                CREATED     INTEGER     NOT NULL,\
                                MODIFIED    INTEGER     NOT NULL,\
                                ACTIVE      BOOLEAN     NOT NULL,\
                                PRIMARY KEY (USERID, ROLEID)\
                            );");
                        }
                    }
                });
            });
        });
    }

    Acl.prototype.AddRole = function (name, desc, parent) {
        var self = this;

    };

    Acl.prototype.GetRolesUnder = function (id) {
        var self = this;

        self.DB.all("WITH RECURSIVE\
                UNDER_ROLE(rolename,level,description,id) AS (\
                    SELECT '' as rolename, ? as level, '' as description, 0 as id\
                    UNION ALL\
                    SELECT acl_roles.rolename, under_role.level+1, acl_roles.description, acl_roles.id\
                        FROM acl_roles JOIN under_role ON acl_roles.parent=under_role.level\
                        ORDER BY 2\
                )\
            SELECT id, '/' || rolename, level, description FROM under_role;", id, function (error, rows) {
            console.log(error, rows);
        });
    };

    return Acl;
})();

exports.Acl = Acl;
