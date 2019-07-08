import { fetchMock } from 'fetch-mock';
import thunk from 'redux-thunk';
import { cleanup } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';

import { getProjectUrl } from '../../../../ui/helpers/location';
import pushListFixture from '../../mock/push_list';
import jobListFixtureOne from '../../mock/job_list/job_1';
import jobListFixtureTwo from '../../mock/job_list/job_2';
// import { store } from '../../../../ui/job-view/redux/store';
import {
  LOADING,
  ADD_PUSHES,
  fetchPushes,
  initialState,
} from '../../../../ui/job-view/redux/stores/pushes';

const mockStore = configureMockStore([thunk]);

afterEach(cleanup);

describe('Pushes Redux store', () => {
  const repoName = 'autoland';
  beforeAll(() => {
    fetchMock.get(
      getProjectUrl('/push/?full=true&count=10', repoName),
      pushListFixture,
    );
    fetchMock.get(
      getProjectUrl('/jobs/?push_id=1&count=2000&return_type=list', repoName),
      jobListFixtureOne,
    );

    fetchMock.mock(
      getProjectUrl('/jobs/?push_id=2&count=2000&return_type=list', repoName),
      jobListFixtureTwo,
    );
  });

  afterAll(() => {
    fetchMock.reset();
  });

  test('should get 10 pushes with fetchPushes', async () => {
    const store = mockStore({ pushes: initialState });

    await store.dispatch(fetchPushes());
    const actions = store.getActions();

    expect(actions[0]).toEqual({ type: LOADING });
    expect(actions[1]).toEqual({
      type: ADD_PUSHES,
      pushResults: {
        pushList: pushListFixture.results,
        oldestPushTimestamp: 1424272126,
        allUnclassifiedFailureCount: 0,
        filteredUnclassifiedFailureCount: 0,
        revisionTips: [
          {
            author: 'john@doe.com',
            revision: 'acf46fe8b054',
            title: 'Back out bug 1071880 for causing bug 1083952.',
          },
          {
            author: 'john@doe.com',
            revision: 'b1cc2dd3e35c',
            title:
              'Bug 1133254 - Dehandlify shape-updating object methods, allow setting multiple flags on an object at once, r=terrence.',
          },
        ],
      },
    });
  });

  // test('should add new push and jobs when polling', async () => {
  //   // impl
  // });
  //
  // test('should get 10 with fetchNextPushes', async () => {
  //   // impl
  // });
  //
  // test('should clear the pushList with clearPushes', async () => {
  //   // impl
  // });
  //
  // test('should replace the pushList with setPushes', async () => {
  //   // impl
  // });
  //
  // test('should get new unclassified counts with recalculateUnclassifiedCounts', async () => {
  //   // impl
  // });
  //
  // test('should add to the jobMap with updateJobMap', async () => {
  //   // impl
  // });
  //
  // test('should fetch a new set of pushes with updateRange', async () => {
  //   // impl
  // });
});
