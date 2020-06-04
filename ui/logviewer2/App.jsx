import React from 'react';
import { hot } from 'react-hot-loader/root';

import { getAllUrlParams } from '../helpers/location';
import { isReftest } from '../helpers/job';
import { getJobsUrl, getReftestUrl, getArtifactsUrl } from '../helpers/url';
import { getData } from '../helpers/http';
import JobModel from '../models/job';
import PushModel from '../models/push';
import TextLogStepModel from '../models/textLogStep';
import RepositoryModel from '../models/repository';
import { formatArtifacts } from '../helpers/display';

import Log from './Log';
import Navigation from './Navigation';

class App extends React.PureComponent {
  constructor(props) {
    super(props);
    const queryString = getAllUrlParams();

    this.state = {
      rawLogUrl: '',
      reftestUrl: '',
      jobExists: true,
      jobError: '',
      revision: null,
      errors: [],
      repoName: queryString.get('repo'),
      jobId: queryString.get('job_id'),
      jobUrl: null,
      currentRepo: null,
    };
  }

  componentDidMount() {
    const { repoName, jobId } = this.state;

    const repoPromise = RepositoryModel.getList();
    const jobPromise = JobModel.get(repoName, jobId);

    Promise.all([repoPromise, jobPromise])
      .then(async ([repos, job]) => {
        const currentRepo = repos.find((repo) => repo.name === repoName);

        // set the title of  the browser window/tab
        document.title = job.searchStr;
        const rawLogUrl = job.logs && job.logs.length ? job.logs[0].url : null;
        // other properties, in order of appearance
        // Test to disable successful steps checkbox on taskcluster jobs
        // Test to expose the reftest button in the logviewer actionbar
        const reftestUrl =
          rawLogUrl && job.job_group_name && isReftest(job)
            ? getReftestUrl(rawLogUrl)
            : null;

        this.setState(
          {
            job,
            rawLogUrl,
            reftestUrl,
            jobExists: true,
            currentRepo,
          },
          async () => {
            const params = {
              taskId: job.task_id,
              run: job.retry_id,
              rootUrl: currentRepo.tc_root_url,
            };

            const jobArtifactsPromise = getData(getArtifactsUrl(params));
            let builtFromArtifactPromise;

            if (
              currentRepo.name === 'comm-central' ||
              currentRepo.name === 'try-comm-central'
            ) {
              builtFromArtifactPromise = getData(
                getArtifactsUrl({
                  ...params,
                  ...{ artifactPath: 'public/build/built_from.json' },
                }),
              );
            }
            const pushPromise = PushModel.get(job.push_id);

            Promise.all([
              jobArtifactsPromise,
              pushPromise,
              builtFromArtifactPromise,
            ]).then(
              async ([artifactsResp, pushResp, builtFromArtifactResp]) => {
                const { revision } = await pushResp.json();
                let jobDetails =
                  !artifactsResp.failureStatus && artifactsResp.data.artifacts
                    ? formatArtifacts(artifactsResp.data.artifacts, params)
                    : [];

                if (
                  builtFromArtifactResp &&
                  !builtFromArtifactResp.failureStatus
                ) {
                  jobDetails = [...jobDetails, ...builtFromArtifactResp.data];
                }

                this.setState({
                  revision,
                  jobUrl: getJobsUrl({
                    repo: repoName,
                    revision,
                    selectedJob: jobId,
                  }),
                  jobDetails,
                });
              },
            );
          },
        );
      })
      .catch((error) => {
        this.setState({
          jobExists: false,
          jobError: error.toString(),
        });
      });

    TextLogStepModel.get(jobId).then((textLogSteps) => {
      const stepErrors = textLogSteps.length ? textLogSteps[0].errors : [];
      const errors = stepErrors.map((error) => ({
        line: error.line,
        lineNumber: error.line_number + 1,
      }));

      this.setState({ errors });
    });
  }

  render() {
    const {
      job,
      rawLogUrl,
      reftestUrl,
      jobError,
      jobExists,
      jobUrl,
    } = this.state;

    return (
      <div className="d-flex flex-column body-logviewer h-100">
        <Navigation
          jobExists={jobExists}
          result={job ? job.result : ''}
          jobError={jobError}
          rawLogUrl={rawLogUrl}
          reftestUrl={reftestUrl}
          jobUrl={jobUrl}
        />
        {job && (
          <div className="d-flex flex-column flex-fill">
            <div className="d-flex flex-fill overflow-auto">
              <Log url={rawLogUrl} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default hot(App);
