import logger from 'winston';
import PromiseA from 'bluebird';
import Random from './helpers/Random';
import moment from 'moment';

/**
 * create Database object
 * @return {DB} Database module
 */
module.exports.create = () => {
  const DB = {};
  const Notes = new window.PouchDB('notes', {
    adapter: 'idb',
  });

  /**
   * getAllNotes
   * @return {
   *  {
   *  	_id: string,
   *   	title: string,
   *   	body: {
   *   		data: string,
   *   		iv: string
   *   	}
   *  }[]
   * } PromiseA with array of notes
   */
  DB.getAllNotes = () => {
    return Notes.allDocs().then(result => {
      return PromiseA.map(result.rows, row => {
        return DB.getNote(row.id).then(doc => {
          return {
            _id: doc._id,
            _rev: doc._rev,
            revision: doc.revision,
            remoteRevision: doc.remoteRevision,
            data: doc.data,
          };
        });
      }).then(notes => {
        logger.info(JSON.stringify(notes, null, ' '));
        return notes;
      });
    }).catch(err => {
      logger.error('Database#getAllNotes: %s', JSON.stringify(err, null, ' '));
      throw err;
    });
  };

  /**
   * addNote
   * @description id for new note generated as uuid
   * @param  {object} note
   * @param  {string} note.title
   * @param  {object} note.body
   * @param  {string} note.body.data - encrypted data
   * @param  {string} note.body.iv - initialization vector
   * @return {PromiseA} note object
   */
  DB.addNote = (note) => {
    return Notes.put({
      _id: Random.uuid(),
      revision: Random.nextRevision(),
      remoteRevision: null,
      data: {
        title: note.title,
        body: note.body,
        createdAt: moment().toISOString(),
        updatedAt: moment().toISOString(),
      },
    }).then(result => {
      logger.debug(JSON.stringify(result, null, ' '));
      return result;
    }).catch(err => {
      logger.error(
        'Database#addNote(%s): %s',
        JSON.stringify(note, null, ' '),
        JSON.stringify(err, null, ' ')
      );
    });
  };

  /**
   * getNote
   * @param  {string} id - id of note
   * @return {PromiseA} note
   */
  DB.getNote = (id) => {
    return Notes.get(id, {
      attachments: true,
      revs: true,
    }).then(note => {
      logger.info(JSON.stringify(note, null, ' '));
      return note;
    });
  };

  /**
   * editNote
   * @param  {string} id - id of the note to edit
   * @param  {object} note
   * @param  {string} note.title
   * @param  {object} note.body
   * @param  {string} note.body.data - encrypted data
   * @param  {string} note.body.iv - initialization vector
   * @return {PromiseA}
   */
  DB.editNote = (id, note) => {
    return Notes.get(id).then(doc => {
      const changes = {
        _id: id,
        _rev: doc._rev,
        revision: Random.nextRevision(doc.remoteRevision),
        remoteRevision: doc.remoteRevision,
        data: {
          title: note.title || doc.title,
          body: note.body || doc.body,
          createdAt: doc.createdAt,
          updatedAt: moment().toISOString(),
        },
      };

      return Notes.put(changes).then(result => {
        logger.debug(JSON.stringify(result, null, ' '));
        return result;
      }).catch(err => {
        logger.error(
          'Database#editNote(%s): %s',
          JSON.stringify(note, null, ' '),
          JSON.stringify(err, null, ' ')
        );
      });
    });
  };

  DB.bulkUpdate = (data) => {
    return PromiseA.map(data, doc => {
      return Notes.get(doc._id).then(d => {
        doc._rev = d._rev;
        return doc;
      }).catch(err => {
        logger.error(JSON.stringify(err, null, ' '));
        return doc;
      });
    }).then(docs => {
      logger.info('DB.bulkUpdate: complete bulk updating');
      return Notes.bulkDocs(docs);
    });
  };

  DB.drop = () => {
    return Notes.destroy().then(() => {
      logger.info('Database destroyed');
      indexedDB.deleteDatabase('_pouch_notes');
    }).catch(err => {
      logger.error('Database#drop failed: %s', JSON.stringify(err, null, ' '));
      throw err;
    });
  };

  return DB;
};
