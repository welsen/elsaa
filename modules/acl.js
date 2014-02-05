var Acl = (function () {
    function Acl(db) {
        this.DB = db;
        this.UserTable = 'ACL_USERS';
        this.LevelsTable = 'ACL_LEVELS';
        this.LastResult = null;

        var self = this;

        self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", this.UserTable, function (error, row) {
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
        self.DB.get("SELECT * FROM sqlite_master WHERE type = 'table' AND tbl_name = ?", this.LevelsTable, function (error, row) {
            if (error === null) {
                if (row === undefined) {
                    self.DB.run("CREATE TABLE ACL_LEVELS(\
                            ID          INTEGER     PRIMARY KEY AUTOINCREMENT,\
                            LEVELNAME   TEXT        NOT NULL,\
                            CREATED     INTEGER     NOT NULL,\
                            MODIFIED    INTEGER     NOT NULL,\
                            ACTIVE      BOOLEAN     NOT NULL\
                        );");
                }
            }
        });
    }

    return Acl;
})();

exports.Acl = Acl;
