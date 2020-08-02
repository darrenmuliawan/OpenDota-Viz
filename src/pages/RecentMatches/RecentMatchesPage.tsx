import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import * as d3 from 'd3';
import moment from 'moment';
import { heroes_list } from 'assets/constants/heroes';
import { API_KEY, ACCOUNT_ID } from 'assets/constants/account';
import { useHistory } from 'react-router';

interface RecentMatch {
    [key: string]:  number ;
    assists: number;
    cluster: number;
    deaths: number;
    duration: number;
    game_mode: number;
    gold_per_min: number;
    hero_damage: number;
    hero_healing: number;
    hero_id: number;
    is_roaming: number; //
    kills: number;
    lane: number;
    lane_role: number;
    last_hits: number;
    leaver_status: number;
    lobby_type: number;
    match_id: number;
    party_size: number;
    player_slot: number;
    radiant_win: number; //
    skill: number;
    start_time: number;
    tower_damage: number;
    version: number;
    xp_per_min: number;
}

interface Props {

}

export const RecentMatchesPage: React.FC<Props> = (props) => {
    const history = useHistory();
    const [average, setAverage] = useState({
        gpm: 0,
        xpm: 0,
        kill: 0,
        death: 0,
        assist: 0
    })

    const secToDuration = (duration: number) => {
        let hour = Math.floor(duration / 3600);
        let minutes = Math.floor(duration / 60).toString();
        let seconds = (duration % 60).toString();
        if (seconds.length === 1) {
            seconds = "0" + seconds;
        }

        if (hour === 0) {
            return `${minutes}:${seconds}`
        } else {
            minutes = (parseInt(minutes) - 60).toString();
            if (minutes.length === 1) {
                minutes = "0" + minutes;
            }
            return `${hour}:${minutes}:${seconds}`
        }
    }

    useEffect(() => {
        Axios.get(`/players/${ACCOUNT_ID}/recentMatches`, {
            params: {
                api_key: API_KEY
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
            let svg = 
            d3.select('#chart')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.bottom + margin.top)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
    
            let data: RecentMatch[] = res.data;
            let totalGPM = 0;
            let totalXPM = 0;
            let kill = 0;
            let death = 0;
            let assist = 0;

            for (let i = 0; i < data.length; i++) {
                totalGPM += data[i].gold_per_min;
                totalXPM += data[i].xp_per_min;
                kill += data[i].kills;
                death += data[i].deaths;
                assist += data[i].assists;
            }
            setAverage({
                gpm: totalGPM / data.length,
                xpm: totalXPM / data.length,
                kill: kill / data.length,
                death: death / data.length,
                assist: assist / data.length
            })

            // ADD X AXIS
            let xDomain = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'];

            let x = 
            d3.scaleBand()
            .domain(xDomain)
            .range([0, width])
            .padding(0.2)
    
            svg.append("g")
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .attr('class', 'axisWhite')
    
            // ADD Y AXIS
            let y = d3.scaleLinear()
            .domain([0,60])
            .range([ height, 0 ]);
    
            svg.append('g')
            .call(d3.axisLeft(y))
            .attr('class', 'axisWhite')
            
            // BAR
            let stackGroups = ["kills", "deaths", "assists"];
            let colors = ["#64af6d", "#FF1726", "#3D5BCB"];
            let stackedData = d3.stack().keys(stackGroups)(data);

            // ADD BAR
            svg.append("g")
            .selectAll("g")
            .data(stackedData)
            .enter().append("g")
            .style("fill", (d, i) => colors[i])
            .selectAll('rect')
            .data((d) => d)
            .enter().append("rect")
            .attr("x", (d, i) => {
                return x((i + 1).toString());
            })
            .attr('y', (d) => y(d[1]))
            .attr('height', (d) => y(d[0]) - y(d[1]))
            .attr('width', x.bandwidth())
            .on('click', (d, i) => {
                d3.select("#content__details").html('');
                d3.select("#content__details")
                .append('p')
                .html(`Match Details - ${
                    (d.data.player_slot >= 0 && d.data.player_slot < 128)
                    ?
                        d.data.radiant_win
                        ?
                        'Victory'
                        :
                        'Lost'
                    :
                    (d.data.player_slot >= 128)
                        ?
                        d.data.radiant_win
                        ?
                        'Lost'
                        :
                        'Victory'
                    :
                    '-'
                }`)
                .attr('class', 'white-text large-text');

                d3.select("#content__details")
                .append('p')
                .html(`
                    Match ID: ${d.data.match_id}<br/>
                    Time: ${moment.utc(d.data.start_time * 1000).local().format('MMMM D [at] HH:mm')}<br/>
                    Duration: ${secToDuration(d.data.duration)}<br/>
                    K/D/A: ${d.data.kills}/${d.data.deaths}/${d.data.assists}<br/>
                    GPM: ${d.data.gold_per_min}<br/>
                    XPM: ${d.data.xp_per_min}<br/>
                    Last Hits: ${d.data.last_hits}<br/>
                    Hero Damage: ${d.data.hero_damage}<br/>
                    Hero Healing: ${d.data.hero_healing}<br/>
                    Hero Used: ${heroes_list.find((e) => {
                        return e.id === d.data.hero_id
                    }).localized_name}<br/>
                    Role: ${
                        d.data.lane_role === 1 
                        ? 
                        'Carry'
                        :
                        d.data.lane_role === 2
                        ?
                        'Mid'
                        :
                        d.data.lane_role === 3
                        ?
                        'Offlane'
                        :
                        d.data.lane_role === 4
                        ?
                        'Support'
                        :
                        d.data.lane_role === 5
                        ?
                        'Hard Support'
                        :
                        '-'
                    }<br/>
                    Party Size: ${d.data.party_size}<br/>
                `)
                .attr('class', 'white-text medium-text');
            })

            // ANNOTATION (HIGHLIGHT THE BIGGEST K/D/A RATIO)
            let annotation = {
                kdaRatio: 0,
                x: 0,
                y: 0,
                message: ''
            };
            for (let i = 0; i < data.length; i++) {
                let currentRatio = (data[i].kills + data[i].assists) / data[i].deaths;
                if (currentRatio > annotation.kdaRatio) {
                    annotation.kdaRatio = parseFloat(currentRatio.toFixed(1));
                    annotation.x = i + 1;
                    annotation.y = data[i].kills + data[i].deaths + data[i].assists;
                    annotation.message = `Match #${annotation.x} is the one with the highest K/D/A ratio of ${currentRatio}`
                }
            }
            console.log(annotation);

            // ADDING ANNOTATION TEXT
            svg.append('text')
            .attr('x', x(annotation.x.toString()))
            .attr('y', 50)
            .attr("text-anchor", "middle")
            .style('fill', '#FFFFFF')
            .attr('class', 'small-text bold')
            .text(annotation.message)
            
            // ADDING ANNOTATION PATH TO BAR
            svg.append('line')
            .style('stroke', '#FFFFFF')
            .attr('x1', x(annotation.x.toString()) + 25)
            .attr('x2', x(annotation.x.toString()) + 25)
            .attr('y1', 80)
            .attr('y2', y(annotation.y))

            // ADD LEGEND
            svg.append('text')
            .attr('x', x('20') + 96)
            .attr('y', 0)
            .text('Legend')
            .attr('class', 'medium-text')
            .attr('fill', '#FFFFFF');

            svg.append('rect')
            .attr('x', x('20') + 100)
            .attr('y', 20)
            .attr('height', 10)
            .attr('width', 10)
            .style('fill', '#64af6d');

            svg.append('text')
            .attr('x', x('20') + 120)
            .attr('y', 29)
            .text('Kills')
            .attr('class', 'small-text')
            .attr('fill', '#FFFFFF')

            svg.append('rect')
            .attr('x', x('20') + 100)
            .attr('y', 40)
            .attr('height', 10)
            .attr('width', 10)
            .style('fill', '#FF1726');

            svg.append('text')
            .attr('x', x('20') + 120)
            .attr('y', 49)
            .text('Deaths')
            .attr('class', 'small-text')
            .attr('fill', '#FFFFFF')

            svg.append('rect')
            .attr('x', x('20') + 100)
            .attr('y', 60)
            .attr('height', 10)
            .attr('width', 10)
            .style('fill', '#3D5BCB');

            svg.append('text')
            .attr('x', x('20') + 120)
            .attr('y', 69)
            .text('Assists')
            .attr('class', 'small-text')
            .attr('fill', '#FFFFFF')

            // ADD X LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .style('fill', "#FFFFFF")
            .text("Match #");

            // ADD Y LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("y", -50)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .style('fill', "#FFFFFF")
            .text("Total K/D/A");
        }).catch(e => {
            console.log(e.response);
        });

        // Axios.get(`/players/${ACCOUNT_ID}/heroes`)
        // .then(res => {
        //     console.log(res);
        // }).catch(e => {
        //     console.log(e.response);
        // })

        // Axios.get(`/players/${ACCOUNT_ID}/peers`)
        // .then(res => {
        //     console.log(res);
        // }).catch(e => {
        //     console.log(e);
        // })
        
    }, []);

    return (
        <div className="body">
            <div className="header">
                <div className="header__list">
                    <p className="large-text white-text header__list__selected" onClick={() => history.push('/')}>Recent Matches</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/heroes')}>Heroes</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/peers')}>Peers</p>
                </div>
            </div>
            <div className="content">
                <div className="content__left">
                    <p className="large-text white-text">Recent matches statistics</p>
                    <p className="large-text lightgrey-text">On your 20 recent matches, your average <span className="white-text bold">GPM (Gold per minute)</span> is <span className="white-text bold">{average.gpm.toFixed(0)}</span>, <span className="white-text bold">XPM (Experience per minute)</span> is <span className="white-text bold">{average.xpm.toFixed(0)}</span>, <span className="white-text bold">Kill</span> is <span className="white-text bold">{average.kill.toFixed(0)}</span>, <span className="white-text bold">Death</span> is <span className="white-text bold">{average.death.toFixed(0)}</span>, and <span className="white-text bold">Assist</span> is <span className="white-text bold">{average.assist.toFixed(0)}</span>.</p>
                    <svg id="chart"/>
                </div>
                <div id="content__details">
                    <p className="white-text large-text">Match Details</p>
                    <p className="lightgrey-text medium-text">Please click on the stacked bar chart to see the match details</p>
                </div>
            </div>
        </div>
    )
}