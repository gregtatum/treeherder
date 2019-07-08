import React from 'react';
import { fetchMock } from 'fetch-mock';
import { Provider } from 'react-redux';
import { render, cleanup, waitForElement } from '@testing-library/react';

import { getProjectUrl } from '../../../ui/helpers/location';
import FilterModel from '../../../ui/models/filter';
import pushListFixture from '../mock/push_list';
import jobListFixtureOne from '../mock/job_list/job_1';
import jobListFixtureTwo from '../mock/job_list/job_2';
import { store } from '../../../ui/job-view/redux/store';
import PushList from '../../../ui/job-view/pushes/PushList';
import { PinnedJobs } from '../../../ui/job-view/context/PinnedJobs';

afterEach(cleanup);

describe('PushList', () => {
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

  const currentRepo = {
    id: 4,
    repository_group: {
      name: 'development',
      description: 'meh',
    },
    name: repoName,
    dvcs_type: 'hg',
    url: 'https://hg.mozilla.org/autoland',
    branch: null,
    codebase: 'gecko',
    description: '',
    active_status: 'active',
    performance_alerts_enabled: false,
    expire_performance_data: true,
    is_try_repo: false,
    pushLogUrl: 'https://hg.mozilla.org/autoland/pushloghtml',
    revisionHrefPrefix: 'https://hg.mozilla.org/autoland/rev/',
    getRevisionHref: () => {},
  };
  const testPushList = filterModel => (
    <Provider store={store}>
      <PinnedJobs>
        <PushList
          user={{ isLoggedIn: false }}
          repoName={repoName}
          currentRepo={currentRepo}
          filterModel={filterModel}
          duplicateJobsVisible={false}
          groupCountsExpanded={false}
          pushHealthVisibility="None"
          getAllShownJobs={() => {}}
        />
      </PinnedJobs>
    </Provider>
  );

  test('should have 2 pushes', async () => {
    const { getAllByText } = render(testPushList(new FilterModel()));
    const pushes = await waitForElement(() => getAllByText('View Tests'));

    expect(pushes).toHaveLength(2);
  });

  // test('should be able to select a job', async () => {
  //   // impl
  // });
  //
  // test('should not reload when clicking a loaded revision', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when changing revision to null in url', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when setting fromchange', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when setting fromchange in url', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when setting tochange', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when setting startdate', async () => {
  //   // impl
  // });
  //
  // test('should reload pushes when setting author', async () => {
  //   // impl
  // });
  //
  // test('switching repo should put new repo on the left on SecondaryNavBar', async () => {
  //   // impl
  // });
  //
  // test('switching repo should update count of unclassified', async () => {
  //   // impl
  // });
});
