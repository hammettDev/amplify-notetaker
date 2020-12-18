import { withAuthenticator } from 'aws-amplify-react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { useState, useEffect } from 'react';
//Provided by aws appsync
import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import {
	onCreateNote,
	onDeleteNote,
	onUpdateNote,
} from './graphql/subscriptions';
let onCreateListener, onUpdateListener, onDeleteListener;

function App() {
	const [notes, setnotes] = useState([]);
	const [note, setnote] = useState('');
	const [noteId, setnoteId] = useState('');
	// Initial Data Pull
	useEffect(() => {
		getNotes();
	}, []);
	// Subscriptions
	useEffect(() => {
		createNoteSubscription();
		updateNoteSubscription();
		deleteNoteSubscription();

		return () => {
			onCreateListener.unsubscribe();
			onUpdateListener.unsubscribe();
			onDeleteListener.unsubscribe();
		};
	}, []);

	// API Pull for data
	const getNotes = async () => {
		const result = await API.graphql(graphqlOperation(listNotes));
		setnotes(result.data.listNotes.items);
	};
	// Create Subscriber
	const createNoteSubscription = async () => {
		const owner = await Auth.currentAuthenticatedUser();
		console.log(notes);
		onCreateListener = await API.graphql(
			graphqlOperation(onCreateNote, {
				owner: owner.username,
			})
		).subscribe({
			next: (noteData) => {
				console.log(notes);
				const newNote = noteData.value.data.onCreateNote;
				setnotes((prevNotes) => {
					const oldNotes = prevNotes.filter(
						(note) => note.id !== newNote.id
					);
					const updatedNotes = [...oldNotes, newNote];
					return updatedNotes;
				});
				setnote('');
			},
		});
	};

	const updateNoteSubscription = async () => {
		const owner = await Auth.currentAuthenticatedUser();
		onUpdateListener = await API.graphql(
			graphqlOperation(onUpdateNote, {
				owner: owner.username,
			})
		).subscribe({
			next: (noteData) => {
				const updatedNote = noteData.value.data.onUpdateNote;
				setnotes((prevNotes) => {
					const index = prevNotes.findIndex(
						(note) => note.id === updatedNote.id
					);
					const updatedNotes = [
						...prevNotes.slice(0, index),
						updatedNote,
						...prevNotes.slice(index + 1),
					];
					return updatedNotes;
				});
				setnote('');
				setnoteId('');
			},
		});
	};

	const deleteNoteSubscription = async () => {
		const owner = await Auth.currentAuthenticatedUser();
		onDeleteListener = await API.graphql(
			graphqlOperation(onDeleteNote, {
				owner: owner.username,
			})
		).subscribe({
			next: (noteData) => {
				const deletedNote = noteData.value.data.onDeleteNote;
				setnotes((prevNotes) => {
					const updatedNotes = prevNotes.filter(
						(note) => note.id !== deletedNote.id
					);

					return updatedNotes;
				});
			},
		});
	};
	// Maybe could have used ref's here
	const handleChangeNote = (e) => {
		setnote(e.target.value);
	};
	// populate the input form with the data from the note you selected
	const handleSetNote = ({ note, id }) => {
		setnote(note);
		setnoteId(id);
	};
	// Check if we have a note selected to choose to edit or create new note
	const hasExistingNote = () => {
		if (noteId) {
			const isNote = notes.findIndex((note) => note.id === noteId) > -1; // make expression return true instead of index
			return isNote;
		}
		return false;
	};
	// Handle Adding or Editing
	const handleAddNote = async (e) => {
		e.preventDefault();
		if (hasExistingNote()) {
			handleUpdateNote(e);
		} else {
			const input = {
				note,
			};
			await API.graphql(graphqlOperation(createNote, { input }));
		}
	};
	// The meat of the editing code
	const handleUpdateNote = async (e) => {
		e.preventDefault();
		const input = { id: noteId, note };
		await API.graphql(graphqlOperation(updateNote, { input }));
	};
	// Delete functionality, somewhat buggy currently for me
	const handleDeleteNote = async (id) => {
		const input = { id };
		await API.graphql(graphqlOperation(deleteNote, { input }));
	};
	// JSX
	return (
		<div className='flex flex-column items-center justify-center pa3 bg-washed-red'>
			<h1 className='code f2-1'>Amplify Notetaker</h1>
			<form className='mb3' onSubmit={handleAddNote}>
				<input
					type='text'
					className='pa2 f4'
					placeholder='Write your note'
					onChange={handleChangeNote}
					value={note}
				/>
				<button className='pa2 f4' type='submit'>
					{noteId ? 'Update Note' : 'Add Note'}
				</button>
				{/* Notes List */}
				<div>
					{notes.map((item) => (
						<div key={item.id} className='flex items-center'>
							<li
								onClick={() => handleSetNote(item)}
								className='list pa1 f3'
							>
								{item.note}
							</li>
							<button
								type='button'
								onClick={() => handleDeleteNote(item.id)}
								className='bg-transparent bn f4'
							>
								<span>&times;</span>
							</button>
						</div>
					))}
				</div>
			</form>
		</div>
	);
}
// Cognito Authentication, includeGreetings is for the included top bar
export default withAuthenticator(App, { includeGreetings: true });
