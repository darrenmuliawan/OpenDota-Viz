import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import * as d3 from 'd3';
import moment from 'moment';
import { ACCOUNT_ID, API_KEY } from 'assets/constants/account';
import { heroes_list } from 'assets/constants/heroes';
import { useHistory } from 'react-router';
import { text } from 'd3';

interface Hero {
    hero_id: string;
    against_games: number;
    against_win: number;
    games: number;
    last_played: number;
    win: number;
    with_games: number;
    with_win: number;
}

interface Props {

}

export const HeroesPage: React.FC<Props> = (props) => {
    const history = useHistory();
    const [minGames, setMinGames] = useState('50');

    useEffect(() => {
        Axios.get(`/players/${ACCOUNT_ID}/heroes`, {
            params: {
                api_key: API_KEY,
                having: minGames 
            }
        })
        .then(res => {
            console.log(res);
            let margin = {
                top: 50,
                right: 200,
                bottom: 100,
                left: 100
            }
            let width = 1200 - margin.left - margin.right;
            let height = 700 - margin.top - margin.bottom;

            // RESET CHART
            d3.select('#chart').selectAll('*').remove();

            let svg = 
            d3.select('#chart')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.bottom + margin.top)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

            let data: Hero[] = res.data;
            let max = {
                win: 0,
                games: 0,
            }

            for (let i = 0; i < data.length; i++) {
                if (data[i].win > max.win) {
                    max.win = data[i].win;
                }

                if (data[i].games > max.games) {
                    max.games = data[i].games;
                }
            } 
            
            // ADD X AXIS
            let x =
            d3.scaleLinear()
            .domain([0, max.games])
            .range([0, width])
    
            svg.append("g")
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .attr('class', 'axisWhite')
    
            // ADD Y AXIS
            let y = d3.scaleLinear()
            .domain([0, max.win])
            .range([ height, 0 ]);
    
            svg.append('g')
            .call(d3.axisLeft(y))
            .attr('class', 'axisWhite')

            // ADD HEROES TO CHART
            svg.append('g')
            .selectAll('text')
            .data(data)
            .enter().append('text')
            .attr('x', (d) => x(d.games))
            .attr('y', (d) => y(d.win))
            .style('fill', '#FFFFFF')
            .attr('class', 'medium-text node')
            .attr('text-anchor', 'end')
            .attr('id', (d,i) => `heroes-${d.hero_id}`)
            .text((d) => heroes_list.find((e) => e.id === parseInt(d.hero_id)).localized_name)
            .on('click', (d,i) => {
                let selectedNode = d3.select(`#heroes-${d.hero_id}`);

                // REMOVE SELECTED NODE
                d3.selectAll('.node').classed('node--selected', false);

                // ADD SELECTED NODE
                selectedNode.classed("node--selected", true);

                d3.select("#content__details").html('');
                d3.select("#content__details")
                .append('p')
                .html('Heroes Details')
                .attr('class', 'white-text large-text')

                d3.select('#content__details')
                .append('p')
                .html(`
                    Name: ${heroes_list.find((e) => {
                        return e.id === parseInt(d.hero_id)
                    }).localized_name}<br/>
                    Number of games using this hero: ${d.games}<br/>
                    Win Rate using this hero: ${(d.win / d.games * 100).toFixed(2)}%<br/>
                    Win Rate against this hero: ${(d.against_win / d.against_games * 100).toFixed(2)}%<br/>
                    Last played: ${moment.utc(d.last_played * 1000).local().format('MM/DD/YYYY [at] HH:mm:ss')}<br/>
                `)
                .attr('class', 'white-text medium-text')
            })

            // ADD TREND LINE
            svg.append('line')
            .style('stroke', '#FF8000')
            .attr('x1', 0)
            .attr('x2', x(max.games))
            .attr('y1', y(0))
            .attr('y2', y(100))

            // ANNOTATION (HIGHLIGHT BEST AGAINST WIN RATE)
            let annotation = {
                against_wr: 0,
                x: 0,
                y: 0,
                message: '',
                html: '',
                hero_id: ''
            }
            for (let i = 0; i < data.length; i++) {
                let currentAgainstWR = (data[i].against_win / data[i].against_games) * 100;
                if (currentAgainstWR > annotation.against_wr) {
                    annotation.against_wr = currentAgainstWR;
                    annotation.x = data[i].games;
                    annotation.y = data[i].win;
                    annotation.message = `You have highest win rate against ${heroes_list.find((e) => e.id === parseInt(data[i].hero_id)).localized_name}.`;
                    annotation.html = `
                        Name: ${heroes_list.find((e) => {
                            return e.id === parseInt(data[i].hero_id)
                        }).localized_name}<br/>
                        Number of games using this hero: ${data[i].games}<br/>
                        Win Rate using this hero: ${(data[i].win / data[i].games * 100).toFixed(2)}%<br/>
                        Win Rate against this hero: ${(data[i].against_win / data[i].against_games * 100).toFixed(2)}%<br/>
                        Last played: ${moment.utc(data[i].last_played * 1000).local().format('MM/DD/YYYY [at] HH:mm:ss')}<br/>
                    `;
                    annotation.hero_id = data[i].hero_id;
                }
            }

            // ADDING ANNOTATION TEXT
            svg.append('text')
            .attr('x', x(annotation.x))
            .attr('y', height - 50)
            .attr('text-anchor', 'middle')
            .style('fill', '#FFFFFF')
            .attr('class', 'small-text bold')
            .text(annotation.message);

            // HIGHLIGHT HERO
            d3.select("#content__details").html('');

            d3.select(`#heroes-${annotation.hero_id}`).classed('node--selected', true);

            d3.select("#content__details")
            .append('p')
            .html('Heroes Details')
            .attr('class', 'white-text large-text')

            d3.select('#content__details')
            .append('p')
            .html(annotation.html)
            .attr('class', 'white-text medium-text');

            // ADDING ANNOTATION PATH TO TEXT
            svg.append('line')
            .style('stroke', '#FFFFFF')
            .attr('x1', x(annotation.x) - 20)
            .attr('x2', x(annotation.x) - 20)
            .attr('y1', height - 80)
            .attr('y2', y(annotation.y) + 20)

            // ADD LEGEND
            svg.append('text')
            .attr('x', x(max.games) + 56)
            .attr('y', 0)
            .text('Legend')
            .attr('class', 'medium-text')
            .attr('fill', '#FFFFFF');

            svg.append('circle')
            .attr('cx', x(max.games) + 60)
            .attr('cy', 20)
            .attr('r', 6)
            .style('fill', '#FF8000');

            svg.append('text')
            .attr('x', x(max.games) + 70)
            .attr('y', 24)
            .text('50% Win Rate')
            .attr('class', 'small-text')
            .attr('fill', '#FFFFFF')

            // ADD X LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .style('fill', "#FFFFFF")
            .text("Number of games");

            // ADD Y LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("y", -50)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .style('fill', "#FFFFFF")
            .text("Total wins");
        }).catch(e => {
            console.log(e.response);
        })
    }, [minGames]);

    return (
        <div className="body">
            <div className="header">
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/')}>Recent Matches</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text header__list__selected" onClick={() => history.push('/heroes')}>Heroes</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/peers')}>Peers</p>
                </div>
            </div>
            <div className="content">
                <div className="content__left">
                    <p className="large-text white-text">Your heroes # of games vs. # of wins</p>
                    <p className="large-text lightgrey-text">People tends to perform better in games using their favorite hero. As we can see in the chart, the win rate of the heroes that I played more tends to be higher than the win rate of the heroes that I played less. People will also tend to perform better <span className="bold white-text">against</span> heroes that they played more as they knew better about the hero's weakness and strength.</p>
                    <div className="slider">
                        <div className="slider__label">
                            <p className="small-text white-text">0</p>
                            <p className="small-text white-text">Min. games played ({minGames})</p>
                            <p className="small-text white-text">100</p>
                        </div>
                        <input type="range" min="0" max="100" value={minGames} onChange={(e) => setMinGames(e.target.value)}/>
                    </div>
                    <svg id="chart"/>
                </div>
                <div id="content__details">
                    <p className="white-text large-text">Heroes Details</p>
                    <p className="lightgrey-text medium-text">Please click on the hero's name to see the details</p>
                </div>
            </div>
        </div>
    )
} 